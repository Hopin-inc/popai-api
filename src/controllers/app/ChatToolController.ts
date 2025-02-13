import { Controller } from "tsoa";
import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";
import { IsNull, Not } from "typeorm";
import { IChatToolInfo, ISelectItem } from "@/types/app";
import { ChatToolId } from "@/consts/common";
import SlackClient from "@/integrations/SlackClient";
import { ChatToolUserRepository } from "@/repositories/settings/ChatToolUserRepository";
import ChatToolUser from "@/entities/settings/ChatToolUser";
import { UserRepository } from "@/repositories/settings/UserRepository";
import LineWorksClient from "@/integrations/LineWorksClient";
import { ChannelResponse } from "@/types/lineworks";

export default class ChatToolController extends Controller {
  private slackService: SlackClient;
  private lineworksService: LineWorksClient;

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

  public async getUsers(chatToolId: number, companyId: string): Promise<ISelectItem<string>[]> {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        this.slackService = await SlackClient.init(companyId);
        return this.slackService.getUsers();
      case ChatToolId.LINEWORKS:
        this.lineworksService = await LineWorksClient.init(companyId);
        return this.lineworksService.getUsers();
      default:
        return [];
    }
  }

  public async updateChatToolUser(
    chatToolId: number,
    companyId: string,
    userId: string,
    appUserId: string,
  ): Promise<any> {
    const user = await UserRepository.findOneBy({ id: userId, companyId: companyId });
    if (user) {
      await ChatToolUserRepository.upsert(new ChatToolUser(userId, chatToolId, appUserId), []);
    }
  }

  public async getChannels(chatToolId: number, companyId: string): Promise<ISelectItem<string>[]> {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        this.slackService = await SlackClient.init(companyId);
        return this.slackService.getChannels();
      case ChatToolId.LINEWORKS:
        this.lineworksService = await LineWorksClient.init(companyId);
        return this.lineworksService.getChannels();
      default:
        return [];
    }
  }

  public async getChannelInfo(botId: string, channelId: string, chatToolId: number, companyId: string): Promise<ChannelResponse> {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        return {};
      case ChatToolId.LINEWORKS:
        this.lineworksService = await LineWorksClient.init(companyId);
        return this.lineworksService.getChannelInfo(botId, channelId);
      default:
        return {};
    }
  }

  public async getBots(botType: string, chatToolId: number, companyId: string): Promise<ISelectItem<string>[]> {
    switch (chatToolId) {
      case ChatToolId.SLACK:
        return [];
      case ChatToolId.LINEWORKS:
        this.lineworksService = await LineWorksClient.init(companyId);
        return this.lineworksService.getBots(botType);
      default:
        return [];
    }
  }
}
