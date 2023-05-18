import { Service } from "typedi";
import { FindOptionsWhere, IsNull, Not } from "typeorm";
import { Backlog } from "backlog-js";
import "isomorphic-fetch";
import "isomorphic-form-data";
import { TodoAppId } from "@/consts/common";
import { IProperty, ISelectItem } from "@/types/app";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";
import { StatusCodes } from "@/common/StatusCodes";
import {
  GetIssueListResponse,
  GetIssueResponse,
  GetProjectListResponse,
  GetStatusListResponse,
  GetUserListResponse,
  GetWebhookListResponse,
  PostWebhookResponse,
} from "@/types/backlog";
import { ActivityTypeIds } from "@/consts/backlog";
import { HttpException } from "@/exceptions";
import BacklogOAuthClient from "@/integrations/BacklogOAuthClient";
import ImplementedTodoApp from "@/entities/settings/ImplementedTodoApp";

const RETRY_LIMIT: number = 2;

@Service()
export default class BacklogClient {
  private client: Backlog;
  private companyId: string;
  private refreshToken: string;
  private host: string;
  private baseUrl?: string;
  private retry: number;

  public static async init(companyId: string, baseUrl?: string): Promise<BacklogClient> {
    const ita = await ImplementedTodoAppRepository.findOneBy({
      companyId,
      todoAppId: TodoAppId.BACKLOG,
      accessToken: Not(IsNull()),
    });
    if (ita) {
      const service = new BacklogClient();
      service.client = new Backlog({ accessToken: ita.accessToken, host: ita.appWorkspaceId });
      service.companyId = companyId;
      service.refreshToken = ita.refreshToken;
      service.host = ita.appWorkspaceId;
      service.baseUrl = baseUrl;
      service.retry = 0;
      return service;
    }
  }

  private async refresh() {
    if (++this.retry >= RETRY_LIMIT) {
      throw new HttpException("Retry limit exceeded", StatusCodes.INTERNAL_SERVER_ERROR);
    }
    const oauth2 = new BacklogOAuthClient();
    const accessToken = await oauth2.regenerateToken(this.refreshToken, this.host);
    const criteria: FindOptionsWhere<ImplementedTodoApp> = {
      companyId: this.companyId,
      todoAppId: TodoAppId.BACKLOG,
    };
    await ImplementedTodoAppRepository.update(criteria, {
      accessToken: accessToken.access_token,
      refreshToken: accessToken.refresh_token,
      installation: accessToken,
    });
  }

  private async retryOnError<T>(func: (...args: any[]) => Promise<T>): Promise<T> {
    try {
      return await func();
    } catch (error) {
      await this.refresh();
      return this.retryOnError(func);
    }
  }

  public async getUsers<IncludeEmail extends boolean = boolean>(
    includeEmail?: IncludeEmail,
  ): Promise<
    (IncludeEmail extends true ? ISelectItem<string> & { email?: string } : ISelectItem<string>)[]
  > {
    try {
      const users: GetUserListResponse = await this.retryOnError(() => this.client.getUsers());
      return users
        .map(user => {
          const email = includeEmail ? { email: user.mailAddress } : {};
          return { id: user.id.toString(), name: user.name, ...email };
        });
    } catch (error) {
      if (error.status === StatusCodes.UNAUTHORIZED) {
        error.status = StatusCodes.BAD_REQUEST;
      }
      throw new Error(error);
    }
  }

  public async getProjects(): Promise<ISelectItem<string>[]> {
    try {
      const projects: GetProjectListResponse = await this.retryOnError(() => this.client.getProjects());
      return projects.map(project => ({
        id: project.id.toString(),
        name: project.name,
      }));
    } catch (error) {
      if (error.status === StatusCodes.UNAUTHORIZED) {
        error.status = StatusCodes.BAD_REQUEST;
      }
      throw new Error(error);
    }
  }

  public async getProperties(projectId: number): Promise<IProperty[]> {
    try {
      const statusList: GetStatusListResponse = await this.retryOnError(() => this.client.getProjectStatuses(projectId));
      const availableOptions = statusList.map(status => ({
        id: status.id.toString(),
        name: status.name,
      }));
      return [{ id: "status", name: "status", type: 0, availableOptions }];
    } catch (error) {
      if (error.status === StatusCodes.UNAUTHORIZED) {
        error.status = StatusCodes.BAD_REQUEST;
      }
      throw new Error(error);
    }
  }

  public async deleteWebhooks(companyId: string, projectId: number): Promise<void> {
    const webhooks = await this.retryOnError(() => this.getWebhookList(projectId));
    await Promise.all(webhooks
      .filter(webhook => webhook.hookUrl === this.generateHookUrl(companyId))
      .map(async webhook => {
        const webhookId = webhook.id.toString();
        return this.retryOnError(() => this.deleteWebhook(projectId, webhookId));
      }),
    );
  }

  private async getWebhookList(projectId: number): Promise<GetWebhookListResponse> {
    return this.retryOnError(() => this.client.getWebhooks(projectId));
  }

  private async deleteWebhook(projectId: number, webhookId: string): Promise<void> {
    await this.retryOnError(() => this.client.deleteWebhook(projectId, webhookId));
  }

  public async addWebhook(companyId: string, projectId: number): Promise<PostWebhookResponse> {
    const name = "POPAI";
    const hookUrl = this.generateHookUrl(companyId);
    const allEvent = false;
    const activityTypeIds = [
      ActivityTypeIds.ISSUE_CREATED,
      ActivityTypeIds.ISSUE_UPDATED,
      ActivityTypeIds.ISSUE_COMMENTED,
      ActivityTypeIds.ISSUE_DELETED,
      ActivityTypeIds.ISSUE_MULTI_UPDATED,
      ActivityTypeIds.MILESTONE_CREATED,
      ActivityTypeIds.MILESTONE_UPDATED,
      ActivityTypeIds.MILESTONE_DELETED,
    ];
    return this.retryOnError(() => this.client.postWebhook(projectId, { name, hookUrl, allEvent, activityTypeIds }));
  }

  public async getIssues(projectIds: number[], count: number = 100, offset: number = 0): Promise<GetIssueListResponse> {
    return await this.retryOnError(
      () => this.client.getIssues({ projectId: projectIds, count, offset }),
    );
  }

  public async getIssue(issueId: number): Promise<GetIssueResponse> {
    return await this.retryOnError(() => this.client.getIssue(issueId));
  }

  private generateHookUrl(companyId: string) {
    if (!this.baseUrl) {
      throw new Error("BaseURL not specified.");
    }
    const baseUrl = process.env.ENV?.toUpperCase() !== "LOCAL"
      ? this.baseUrl
      : process.env.DEBUG_TUNNEL_BASE_URL;
    return `${ baseUrl }/api/backlog/webhook/${ companyId }`;
  }
}
