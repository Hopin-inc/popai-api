import { Service } from "typedi";
import { WebClient } from "@slack/web-api";
import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";
import { ChatToolId } from "@/consts/common";
import { ISelectItem } from "@/types/app";

@Service()
export default class SlackService {
  private client: WebClient;

  public static async init(companyId?: number): Promise<SlackService> {
    const slackInfo = await ImplementedChatToolRepository.findOneBy({
      company_id: companyId,
      chattool_id: ChatToolId.SLACK,
    });
    const accessToken = slackInfo?.access_token ?? process.env.SLACK_ACCESS_TOKEN;
    const service = new SlackService();
    service.client = new WebClient(accessToken);
    return service;
  }

  public async getUsers(): Promise<ISelectItem<string>[]> {
    const response = await this.client.users.list();
    if (response.ok && response.members) {
      return response.members
        .filter(member => !member.is_invited_user && !member.is_bot && !member.deleted)
        .map(member => ({ id: member.id, name: member.real_name ?? member.name ?? "" }));
    } else {
      return [];
    }
  }

  public async getChannels(): Promise<ISelectItem<string>[]> {
    const response = await this.client.conversations.list();
    if (response.ok && response.channels) {
      return response.channels
        .filter(channel => channel.is_channel && !channel.is_archived)
        .map(channel => ({ id: channel.id, name: `${ channel.is_private ? "🔒" : "#" } ${channel.name}` }));
    }
  }
}