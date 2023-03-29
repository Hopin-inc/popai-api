import { Controller } from "tsoa";
import Container from "typedi";
import NotionOAuthService from "@/services/NotionOAuthService";
import { Request } from "express";
import { SessionRepository } from "@/repositories/transactions/SessionRepository";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";
import ImplementedTodoApp from "@/entities/settings/ImplementedTodoApp";
import { TodoAppId } from "@/consts/common";

export default class NotionController extends Controller {
  private readonly notionOAuthService: NotionOAuthService;

  constructor() {
    super();
    this.notionOAuthService = Container.get(NotionOAuthService);
  }

  public async getAuthUrl(req: Request) {
    const redirectUri = encodeURIComponent(this.generateRedirectUri(req));
    return "https://api.notion.com/v1/oauth/authorize?owner=user&response_type=code"
      + `&client_id=${ process.env.NOTION_CLIENT_ID }&redirect_uri=${ redirectUri }&state=${ req.session.id }`;
  }

  public async handleCallback(req: Request) {
    const code = req.query.code as string;
    const state = req.query.state as string;
    const redirectUri = this.generateRedirectUri(req);
    const [notionResponse, session] = await Promise.all([
      this.notionOAuthService.generateToken(code, redirectUri),
      SessionRepository.getSessionDataById(state),
    ]);
    if (session) {
      const implementedTodoApp = new ImplementedTodoApp(session.company, TodoAppId.NOTION, notionResponse);
      await ImplementedTodoAppRepository.upsert(implementedTodoApp, []);
    }
  }

  private generateRedirectUri(req: Request) {
    return `${ req.protocol }://${ req.get("host") }/api/notion/oauth_redirect`;
  }
}