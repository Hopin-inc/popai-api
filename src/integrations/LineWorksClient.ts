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
import Line from "@line/bot-sdk";
import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";
import { ChatToolId } from "@/consts/common";
import { ISelectItem } from "@/types/app";
import { IsNull, Not } from "typeorm";
import { fetchApi } from "@/libs/request";
import { GroupsResponse, UsersResponse } from "@/types/lineworks";

@Service()
export default class LineWorksClient {
  private companyId: string;
  // private client: WebClient;
  private accessToken?: string;

  public static async init(companyId: string): Promise<LineWorksClient> {
    const lineWorksInfo = await ImplementedChatToolRepository.findOneBy({
      companyId,
      chatToolId: ChatToolId.LINEWORKS,
      accessToken: Not(IsNull()),
    });
    const service = new LineWorksClient();
    service.accessToken = lineWorksInfo?.accessToken;
    service.companyId = companyId;
    return service;
  }

  private async callUsersApi(count: number, cursor: string) : Promise<UsersResponse>  {
    return fetchApi<UsersResponse>(
      "https://www.worksapis.com/v1.0/users",
      "GET",
      {count, cursor},
      false,
      this.accessToken,
      null,
    );
  }

  private async callGroupsApi(count: number, cursor: string) : Promise<GroupsResponse>  {
    return fetchApi<GroupsResponse>(
      "https://www.worksapis.com/v1.0/groups",
      "GET",
      {count, cursor},
      false,
      this.accessToken,
      null,
    );
  }

  public async getUsers(): Promise<ISelectItem<string>[]> {
    const users: UsersResponse["users"] = [];
    const limit = 100;
    let cursor: string = '';
    do {
      const response = await this.callUsersApi(limit, cursor);
      users.push(...response.users);
      cursor = response.responseMetaData.nextCursor;
    } while (cursor);
    return users
      .filter(member => !member.isDeleted && !member.isSuspended && !member.isPending)
      .map(member => ({
        id: member.userId,
        name: member.nickName ?? member.userName.firstName + ' ' + member.userName.lastName ?? "",
      }));
  }

  public async getChannels(): Promise<ISelectItem<string>[]> {
    const channels: GroupsResponse["groups"] = [];
    const limit = 100;
    let cursor: string = '';
    do {
      const response = await this.callGroupsApi(limit, cursor);
      channels.push(...response.groups);
      cursor = response.responseMetaData.nextCursor;
      
    } while (cursor);
    return channels
      .map(channel => ({
        id: channel.groupId,
        name: `${ !channel.visible ? "🔒" : "#" } ${ channel.groupName }`,
      }));
  }

  // public async postDirectMessage(
  //   users: string,
  //   blocks: (KnownBlock | Block)[],
  //   text: string = "お知らせ",
  // ) {
  //   const response = await this.openDirectMessage(users);
  //   const channel = response?.channel?.id;
  //   return this.postMessage({ channel, text, blocks });
  // }

  // public async openDirectMessage(users: string) {
  //   return this.client.conversations.open({ users });
  // }

  // public async postMessage(options: ChatPostMessageArguments) {
  //   return this.client.chat.postMessage(options);
  // }

  // public async updateMessage(options: ChatUpdateArguments) {
  //   return this.client.chat.update(options);
  // }

  // public async openView(options: ViewsOpenArguments) {
  //   return this.client.views.open(options);
  // }

  // public async getProfile(options: UsersProfileGetArguments) {
  //   return this.client.users.profile.get(options);
  // }

  // public async joinChannel(options: ConversationsJoinArguments) {
  //   return this.client.conversations.join(options);
  // }
}
