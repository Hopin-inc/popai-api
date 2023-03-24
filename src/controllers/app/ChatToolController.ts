import { Controller } from "tsoa";
import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";
import { IsNull, Not } from "typeorm";
import { IChatToolInfo, ISelectItem } from "@/types/app";
import { ValueOf } from "@/types";
import { ChatToolId } from "@/consts/common";
import SlackService from "@/services/SlackService";
import { ChatToolUserRepository } from "@/repositories/settings/ChatToolUserRepository";
import ChatToolUser from "@/entities/settings/ChatToolUser";
import { UserRepository } from "@/repositories/settings/UserRepository";

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

  public async getUsers(chatToolId: ValueOf<typeof ChatToolId>, companyId: number): Promise<ISelectItem<string>[]> {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        this.slackService = await SlackService.init(companyId);
        return this.slackService.getUsers();
      default:
        return [];
    }
  }

  public async updateChatToolUser(
    chatToolId: ValueOf<typeof ChatToolId>,
    companyId: number,
    userId: number,
    appUserId: string,
  ): Promise<any> {
    const user = await UserRepository.findOneBy({ id: userId, company_id: companyId });
    if (user) {
      await ChatToolUserRepository.upsert(new ChatToolUser(chatToolId, userId, appUserId), []);
    }
  }

  public async getChannels(chatToolId: ValueOf<typeof ChatToolId>, companyId: number): Promise<ISelectItem<string>[]> {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        this.slackService = await SlackService.init(companyId);
        return this.slackService.getChannels();
      default:
        return [];
    }
  }
}