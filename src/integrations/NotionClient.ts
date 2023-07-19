import { Service } from "typedi";
import { setTimeout } from "node:timers/promises";
import { NotionPropertyType, TodoAppId } from "@/consts/common";
import { IProperty, ISelectItem } from "@/types/app";
import { Client } from "@notionhq/client";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";
import { StatusCodes } from "@/common/StatusCodes";
import {
  GetPageParameters,
  QueryDatabaseParameters,
  SearchParameters,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { IsNull, Not } from "typeorm";
import logger from "@/libs/logger";
import { HttpException } from "@/exceptions";

const RETRY_LIMIT = 3;
const RETRY_INTERVAL = 60_000;

@Service()
export default class NotionClient {
  private companyId: string;
  private client: Client;

  public static async init(companyId: string): Promise<NotionClient> {
    const ita = await ImplementedTodoAppRepository.findOneBy({
      companyId,
      todoAppId: TodoAppId.NOTION,
      accessToken: Not(IsNull()),
    });
    if (ita) {
      const service = new NotionClient();
      service.companyId = companyId;
      service.client = new Client({ auth: ita.accessToken });
      return service;
    } else {
      const logMeta = {
        companyId,
        todoAppId: TodoAppId.NOTION,
      };
      logger.error("No todo app implemented", logMeta);
    }
  }

  private async retryOnError<T>(func: (...args: any[]) => Promise<T>, retry: number = 0): Promise<T> {
    try {
      return await func();
    } catch (error) {
      if (++retry >= RETRY_LIMIT) {
        const logMeta = {
          ...error,
          companyId: this.companyId,
        };
        const normalStatuses: number[] = [
          StatusCodes.NOT_FOUND,
        ];
        if (normalStatuses.includes(error.status)) {
          logger.warn(error.message, logMeta);
        } else {
          logger.error(error.message, logMeta);
          throw new HttpException("Notion API call failed", StatusCodes.INTERNAL_SERVER_ERROR);
        }
      } else {
        logger.warn(error.message, { ...error, companyId: this.companyId });
        await setTimeout(RETRY_INTERVAL);
        return await this.retryOnError(func, retry);
      }
    }
  }

  public async getUsers<IncludeEmail extends boolean = boolean>(
    includeEmail?: IncludeEmail,
  ): Promise<
    (IncludeEmail extends true ? ISelectItem<string> & { email?: string } : ISelectItem<string>)[]
  > {
    try {
      let response = await this.client.users.list({});
      const users = response.results;
      while (response.has_more) {
        response = await this.client.users.list({
          start_cursor: response.next_cursor,
        });
        users.push(...response.results);
      }
      return users
        .filter(user => user.type === "person")
        .map(user => {
          const email = includeEmail && user.type === "person" ? { email: user.person.email } : {};
          return { id: user.id, name: user.name, ...email };
        });
    } catch (error) {
      if (error.status === StatusCodes.UNAUTHORIZED) {
        error.status = StatusCodes.BAD_REQUEST;
      }
      throw new Error(error);
    }
  }

  public async getWorkspaces(): Promise<ISelectItem<string>[]> {
    try {
      const conditions: SearchParameters = {
        filter: { property: "object", value: "database" },
      };
      let response = await this.client.search(conditions);
      const workspaces = response.results;
      while (response.has_more) {
        response = await this.client.search({
          ...conditions,
          start_cursor: response.next_cursor,
        });
        workspaces.push(...response.results);
      }
      return workspaces.map(workspace => ({
        id: workspace.id,
        name: workspace["title"] && workspace["title"].length && workspace["title"][0]
          ? workspace["title"][0]["plain_text"]
          : `(${ workspace.id })`,
      }));
    } catch (error) {
      if (error.status === StatusCodes.UNAUTHORIZED) {
        error.status = StatusCodes.BAD_REQUEST;
      }
      throw new Error(error);
    }
  }

  public async getProperties(databaseId: string): Promise<IProperty[]> {
    try {
      const response = await this.client.databases.retrieve({
        database_id: databaseId,
      });
      return Object.keys(response.properties).map(name => {
        const property = response.properties[name];
        const options =
          property.type === "select" ? { availableOptions: property.select.options }
            : property.type === "multi_select" ? { availableOptions: property.multi_select.options }
              : property.type === "status" ? { availableOptions: property.status.options }
                : {};
        return {
          id: property.id,
          name: name,
          type: NotionPropertyType[property.type.toUpperCase()],
          ...options,
        };
      });
    } catch (error) {
      if (error.status === StatusCodes.UNAUTHORIZED) {
        error.status = StatusCodes.BAD_REQUEST;
      }
      throw new Error(error);
    }
  }

  public async queryDatabase(options: QueryDatabaseParameters) {
    return await this.retryOnError(() => this.client.databases.query(options));
  }

  public async retrievePage(options: GetPageParameters) {
    return await this.retryOnError(() => this.client.pages.retrieve(options));
  }

  public async updatePage(options: UpdatePageParameters) {
    return this.retryOnError(() => this.client.pages.update(options));
  }
}
