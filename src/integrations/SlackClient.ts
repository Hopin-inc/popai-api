import { Service } from "typedi";
import {
  Block,
  ChatPostMessageArguments,
  ChatUpdateArguments,
  ConversationsJoinArguments, ConversationsListResponse,
  KnownBlock, UsersListResponse,
  UsersProfileGetArguments,
  ViewsOpenArguments,
  WebClient,
} from "@slack/web-api";
import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";
import { ChatToolId } from "@/consts/common";
import { ISelectItem } from "@/types/app";
import { IsNull, Not } from "typeorm";

@Service()
export default class SlackClient {
  private companyId: string;
  private client: WebClient;

  public static async init(companyId: string): Promise<SlackClient> {
    const slackInfo = await ImplementedChatToolRepository.findOneBy({
      companyId,
      chatToolId: ChatToolId.SLACK,
      accessToken: Not(IsNull()),
    });
    const accessToken = slackInfo?.accessToken;
    const service = new SlackClient();
    service.client = new WebClient(accessToken);
    service.companyId = companyId;
    return service;
  }

  public async getUsers(): Promise<ISelectItem<string>[]> {
    const users: UsersListResponse["members"] = [];
    const limit = 100;
    let cursor: string = undefined;
    do {
      const response = await this.client.users.list({
        limit,
        cursor,
      });
      if (response.ok && response.members) {
        users.push(...response.members);
        cursor = response.response_metadata.next_cursor;
      }
    } while (cursor);
    return users
      .filter(member => !member.is_invited_user && !member.is_bot && !member.deleted)
      .map(member => ({
        id: member.id,
        name: member.real_name ?? member.name ?? "",
      }));
  }

  public async getChannels(): Promise<ISelectItem<string>[]> {
    const channels: ConversationsListResponse["channels"] = [];
    const limit = 100;
    let cursor: string = undefined;
    do {
      const response = await this.client.conversations.list({
        exclude_archived: true,
        types: "public_channel,private_channel",
        limit,
        cursor,
      });
      if (response.ok && response.channels) {
        channels.push(...response.channels);
        cursor = response.response_metadata.next_cursor;
      }
    } while (cursor);
    return channels
      .map(channel => ({
        id: channel.id,
        name: `${ channel.is_private ? "🔒" : "#" } ${ channel.name }`,
      }));
  }

  public async postDirectMessage(
    users: string,
    blocks: (KnownBlock | Block)[],
    text: string = "お知らせ",
  ) {
    const response = await this.openDirectMessage(users);
    const channel = response?.channel?.id;
    return this.postMessage({ channel, text, blocks });
  }

  public async openDirectMessage(users: string) {
    return this.client.conversations.open({ users });
  }

  public async postMessage(options: ChatPostMessageArguments) {
    return this.client.chat.postMessage(options);
  }

  public async updateMessage(options: ChatUpdateArguments) {
    return this.client.chat.update(options);
  }

  public async openView(options: ViewsOpenArguments) {
    return this.client.views.open(options);
  }

  public async getProfile(options: UsersProfileGetArguments) {
    return this.client.users.profile.get(options);
  }

  public async joinChannel(options: ConversationsJoinArguments) {
    return this.client.conversations.join(options);
  }
}
