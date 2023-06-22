import { Controller } from "tsoa";
import Container from "typedi";
import BacklogOAuthClient from "@/integrations/BacklogOAuthClient";
import { Request } from "express";
import { SessionRepository } from "@/repositories/transactions/SessionRepository";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";
import ImplementedTodoApp from "@/entities/settings/ImplementedTodoApp";
import { ProjectRule, TodoAppId } from "@/consts/common";
import { extractDomain } from "@/utils/string";
import { BacklogWebhookPayload } from "@/types/backlog";
import { ActivityTypeIds } from "@/consts/backlog";
import BacklogRepository from "@/repositories/BacklogRepository";
import { BoardRepository } from "@/repositories/settings/BoardRepository";
import { ProjectRepository } from "@/repositories/transactions/ProjectRepository";
import logger from "@/libs/logger";

export default class BacklogController extends Controller {
  private readonly backlogOAuthService: BacklogOAuthClient;
  private readonly backlogRepository: BacklogRepository;

  constructor() {
    super();
    this.backlogOAuthService = Container.get(BacklogOAuthClient);
    this.backlogRepository = Container.get(BacklogRepository);
  }

  public async handleWebhook(companyId: string, payload: BacklogWebhookPayload) {
    logger.info(
      `Received: Backlog Webhook { type: ${ payload.type } }`,
      payload,
    );
    const todoAppId = TodoAppId.BACKLOG;
    const [
      implementedTodoApp,
      companyProjects,
      board,
    ] = await Promise.all([
      ImplementedTodoAppRepository.findOne({
        where: { companyId, todoAppId },
        relations: ["company.users.todoAppUser.user"],
      }),
      ProjectRepository.find({
        where: { companyId, todoAppId },
        relations: ["projectUsers"],
      }),
      BoardRepository.findOneByConfig(companyId),
    ]);
    if (implementedTodoApp && board) {
      const host = implementedTodoApp.appWorkspaceId;
      const todoAppUsers = implementedTodoApp.company.users.map(u => u.todoAppUser);
      const projectByParentTodo = board.projectRule === ProjectRule.PARENT_TODO;
      const projectByMilestone = board.projectRule === ProjectRule.MILESTONE;
      switch (payload.type) {
        case ActivityTypeIds.ISSUE_CREATED:
          if (projectByParentTodo && !payload.content.parentIssueId) {
            return this.backlogRepository.createProjectByIssueId(
              companyId,
              payload.content.id,
              todoAppUsers,
              board,
            );
          } else {
            return this.backlogRepository.createTodoByIssuePayload(
              companyId,
              payload,
              host,
              todoAppUsers,
              companyProjects,
              board,
            );
          }
        case ActivityTypeIds.ISSUE_UPDATED:
          if (projectByParentTodo && !payload.content.parentIssueId) {
            return this.backlogRepository.updateProjectByIssueId(
              companyId,
              payload.content.id,
              todoAppUsers,
              companyProjects,
              board,
            );
          } else {
            return this.backlogRepository.updateTodoByIssueId(
              companyId,
              payload.content.id,
              todoAppUsers,
              companyProjects,
              board,
            );
          }
        case ActivityTypeIds.ISSUE_DELETED:
          if (projectByParentTodo && !payload.content.parentIssueId) {
            return this.backlogRepository.deleteProjectByIssuePayload(companyId, payload);
          } else {
            return this.backlogRepository.deleteTodoByIssuePayload(companyId, payload);
          }
        case ActivityTypeIds.ISSUE_MULTI_UPDATED:
          return this.backlogRepository.updateMultiTodos(
            companyId,
            payload,
            todoAppUsers,
            companyProjects,
            board,
          );
        case ActivityTypeIds.MILESTONE_CREATED:
          if (projectByMilestone) {
            return this.backlogRepository.createProjectByMilestonePayload(
              companyId,
              payload,
              host,
              todoAppUsers,
              companyProjects,
              board,
            );
          } else return;
        case ActivityTypeIds.MILESTONE_UPDATED:
          if (projectByMilestone) {
            return this.backlogRepository.updateProjectByMilestonePayload(
              companyId,
              payload,
              host,
              todoAppUsers,
              companyProjects,
              board,
            );
          } else return;
        case ActivityTypeIds.MILESTONE_DELETED:
          if (projectByMilestone) {
            return this.backlogRepository.deleteProjectByMilestonePayload(companyId, payload, board);
          } else return;
        case ActivityTypeIds.ISSUE_COMMENTED:
        default:
          return;
      }
    }
  }

  public async getAuthUrl(req: Request, host: string) {
    const redirectUri = encodeURIComponent(this.generateRedirectUri(req));
    return this.backlogOAuthService.generateAuthUrl(redirectUri, host, req.session.id);
  }

  public async handleCallback(req: Request) {
    const code = req.query.code as string;
    const sessionId = req.query.state as string;
    const hostBaseUrl = req.headers.referer;
    const host = extractDomain(hostBaseUrl);
    const redirectUri = this.generateRedirectUri(req);
    const [accessToken, session] = await Promise.all([
      this.backlogOAuthService.generateToken(code, redirectUri, host),
      SessionRepository.getSessionDataById(sessionId),
    ]);
    if (session) {
      const implementedTodoApp = new ImplementedTodoApp(session.company, TodoAppId.BACKLOG, accessToken, host);
      await ImplementedTodoAppRepository.upsert(implementedTodoApp, []);
    }
  }

  private generateRedirectUri(req: Request) {
    return `${ req.protocol }://${ req.get("host") }/api/backlog/oauth_redirect`;
  }
}
