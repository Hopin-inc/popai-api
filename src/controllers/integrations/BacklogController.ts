import { Controller } from "tsoa";
import Container from "typedi";
import BacklogOAuthClient from "@/integrations/BacklogOAuthClient";
import { Request } from "express";
import { SessionRepository } from "@/repositories/transactions/SessionRepository";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";
import ImplementedTodoApp from "@/entities/settings/ImplementedTodoApp";
import { TodoAppId } from "@/consts/common";
import { extractDomain } from "@/utils/string";
import { BacklogWebhookPayload } from "@/types/backlog";
import { ActivityTypeIds } from "@/consts/backlog";
import BacklogRepository from "@/repositories/BacklogRepository";
import { BoardRepository } from "@/repositories/settings/BoardRepository";

export default class BacklogController extends Controller {
  private readonly backlogOAuthService: BacklogOAuthClient;
  private readonly backlogRepository: BacklogRepository;

  constructor() {
    super();
    this.backlogOAuthService = Container.get(BacklogOAuthClient);
    this.backlogRepository = Container.get(BacklogRepository);
  }

  public async handleWebhook(companyId: string, payload: BacklogWebhookPayload) {
    const [implementedTodoApp, board] = await Promise.all([
      ImplementedTodoAppRepository.findOne({
        where: { companyId, todoAppId: TodoAppId.BACKLOG },
        relations: ["company.users.todoAppUser.user"],
      }),
      BoardRepository.findOneByConfig(companyId),
    ]);
    if (implementedTodoApp && board) {
      const host = implementedTodoApp.appWorkspaceId;
      const todoAppUsers = implementedTodoApp.company.users.map(u => u.todoAppUser);
      switch (payload.type) {
        case ActivityTypeIds.ISSUE_CREATED:
          return this.backlogRepository.createTodo(companyId, payload, host, todoAppUsers, board);
        case ActivityTypeIds.ISSUE_UPDATED:
          return this.backlogRepository.updateTodo(companyId, payload, host, todoAppUsers, board);
        case ActivityTypeIds.ISSUE_DELETED:
          return this.backlogRepository.deleteTodo(companyId, payload);
        case ActivityTypeIds.ISSUE_MULTI_UPDATED:
          return this.backlogRepository.updateMultiTodos(companyId, payload, todoAppUsers, board);
        case ActivityTypeIds.MILESTONE_CREATED:
        case ActivityTypeIds.MILESTONE_UPDATED:
        case ActivityTypeIds.MILESTONE_DELETED:
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
