import { Controller } from "tsoa";
import Container from "typedi";
import NotionOAuthClient from "@/integrations/NotionOAuthClient";
import { Request } from "express";
import { SessionRepository } from "@/repositories/transactions/SessionRepository";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";
import { StatusFeatureRepository } from "@/repositories/settings/StatusConfigRepository";
import ImplementedTodoApp from "@/entities/settings/ImplementedTodoApp";
import { TodoAppId } from "@/consts/common";
import { IsNull } from "typeorm";
import logger from "@/libs/logger";

export default class NotionController extends Controller {
  private readonly notionOAuthService: NotionOAuthClient;

  constructor() {
    super();
    this.notionOAuthService = Container.get(NotionOAuthClient);
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
      const companyId = typeof session.company === "string" ? session.company : session.company.id;
      const todoApp = await ImplementedTodoAppRepository.findOne({
        where: {
          companyId,
          deletedAt: IsNull(),
        },
      });
      if (!todoApp) {
        await ImplementedTodoAppRepository.insert(implementedTodoApp);
      } else {
        await ImplementedTodoAppRepository.update(todoApp.id, implementedTodoApp);
      }
      try {
        const statusConfig = await StatusFeatureRepository.findOne({ where: { companyId } });
        if (!statusConfig) {
          await StatusFeatureRepository.insert({
            companyId,
            level1: "特に問題はない",
            level2: "未奶未古順調",
            level3: "どちらとも言えない",
            level4: "少 不安",
            level5: "全然夕义",
          });
        }
      } catch (error) {
        logger.info("Error:", error.message);
      }
    }
  }

  private generateRedirectUri(req: Request) {
    return `${ req.protocol }://${ req.get("host") }/api/notion/oauth_redirect`;
  }
}
