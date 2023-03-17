import { Controller } from "tsoa";
import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";
import { IsNull, Not } from "typeorm";
import { IChatToolInfo, ISelectItem } from "@/types/app";
import { valueOf } from "@/types";
import { ChatToolId } from "@/consts/common";
import SlackService from "@/services/SlackService";

export default class ChatToolController extends Controller {
  private slackService: SlackService;

  public async getList(companyId: number): Promise<IChatToolInfo[]> {
    const implementedChatTools = await ImplementedChatToolRepository.find({
      where: { company_id: companyId, access_token: Not(IsNull()) },
      order: { chattool_id: "asc" },
    });
    return implementedChatTools.map(ict => ({
      chatToolId: ict.chattool_id,
      teamId: ict.app_team_id,
    }));
  }

  public async getUsers(chatToolId: valueOf<typeof ChatToolId>, companyId: number): Promise<ISelectItem<string>[]> {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        this.slackService = await SlackService.init(companyId);
        return this.slackService.getUsers();
      default:
        return [];
    }
  }

  public async getChannels(chatToolId: valueOf<typeof ChatToolId>, companyId: number): Promise<ISelectItem<string>[]> {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        this.slackService = await SlackService.init(companyId);
        return this.slackService.getChannels();
      default:
        return [];
    }
  }
}