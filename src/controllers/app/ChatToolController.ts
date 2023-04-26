import { Controller } from "tsoa";
import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";
import { IsNull, Not } from "typeorm";
import { IChatToolInfo, ISelectItem } from "@/types/app";
import { ValueOf } from "@/types";
import { ChatToolId } from "@/consts/common";
import SlackClient from "@/integrations/SlackClient";
import { ChatToolUserRepository } from "@/repositories/settings/ChatToolUserRepository";
import ChatToolUser from "@/entities/settings/ChatToolUser";
import { UserRepository } from "@/repositories/settings/UserRepository";

export default class ChatToolController extends Controller {
  private slackService: SlackClient;

  public async get(companyId: string): Promise<IChatToolInfo | null> {
    const implementedChatTool = await ImplementedChatToolRepository.findOne({
      where: { companyId: companyId, accessToken: Not(IsNull()) },
    });
    if (implementedChatTool) {
      const { chatToolId, appTeamId } = implementedChatTool;
      return { chatToolId, teamId: appTeamId };
    } else {
      return null;
    }
  }

  public async getUsers(chatToolId: ValueOf<typeof ChatToolId>, companyId: string): Promise<ISelectItem<string>[]> {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        this.slackService = await SlackClient.init(companyId);
        return this.slackService.getUsers();
      default:
        return [];
    }
  }

  public async updateChatToolUser(
    chatToolId: ValueOf<typeof ChatToolId>,
    companyId: string,
    userId: string,
    appUserId: string,
  ): Promise<any> {
    const user = await UserRepository.findOneBy({ id: userId, companyId: companyId });
    if (user) {
      await ChatToolUserRepository.upsert(new ChatToolUser(userId, chatToolId, appUserId), []);
    }
  }

  public async getChannels(chatToolId: ValueOf<typeof ChatToolId>, companyId: string): Promise<ISelectItem<string>[]> {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        this.slackService = await SlackClient.init(companyId);
        return this.slackService.getChannels();
      default:
        return [];
    }
  }
}
