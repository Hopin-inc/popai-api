import { Service } from "typedi";

import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";
import { ChatToolId } from "@/consts/common";
import { ISelectItem } from "@/types/app";
import { IsNull, Not } from "typeorm";
import { fetchApi } from "@/libs/request";
import { GroupsResponse, LineWorksContent, UsersResponse } from "@/types/lineworks";
import ImplementedChatTool from "@/entities/settings/ImplementedChatTool";

@Service()
export default class LineWorksClient {
  private companyId: string;
  private accessToken?: string;
  private userBotId?: string;
  private channelBotId?: string;

  public static async initFromInfo(lineWorksInfo: ImplementedChatTool): Promise<LineWorksClient> {
    const service = new LineWorksClient();
    service.accessToken = lineWorksInfo?.accessToken;
    service.companyId = lineWorksInfo.companyId;
    service.userBotId = lineWorksInfo?.userBotId;
    service.channelBotId = lineWorksInfo?.channelBotId;
    return service;
  }

  public static async init(companyId: string): Promise<LineWorksClient> {
    const lineWorksInfo = await ImplementedChatToolRepository.findOneBy({
      companyId,
      chatToolId: ChatToolId.LINEWORKS,
      accessToken: Not(IsNull()),
    });
    const service = new LineWorksClient();
    service.accessToken = lineWorksInfo?.accessToken;
    service.companyId = companyId;
    service.userBotId = lineWorksInfo?.userBotId;
    service.channelBotId = lineWorksInfo?.channelBotId;
    return service;
  }

  private async callUsersApi(count: number, cursor: string) : Promise<UsersResponse>  {
    return fetchApi<UsersResponse>(
      "https://www.worksapis.com/v1.0/users",
      "GET",
      { count, cursor },
      false,
      this.accessToken,
      null,
    );
  }

  private async callGroupsApi(count: number, cursor: string) : Promise<GroupsResponse>  {
    return fetchApi<GroupsResponse>(
      "https://www.worksapis.com/v1.0/groups",
      "GET",
      { count, cursor },
      false,
      this.accessToken,
      null,
    );
  }

  public async getUsers(): Promise<ISelectItem<string>[]> {
    const users: UsersResponse["users"] = [];
    const limit = 100;
    let cursor: string = "";
    do {
      const response = await this.callUsersApi(limit, cursor);
      users.push(...response.users);
      cursor = response.responseMetaData.nextCursor;
    } while (cursor);
    return users
      .filter(member => !member.isDeleted && !member.isSuspended && !member.isPending)
      .map(member => ({
        id: member.userId,
        name: (member.userName.lastName + " " + member.userName.firstName).trim() || member.nickName || "",
      }));
  }

  public async getChannels(): Promise<ISelectItem<string>[]> {
    const channels: GroupsResponse["groups"] = [];
    const limit = 100;
    let cursor: string = "";
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

  public async postUserMessage(userId: string, content: LineWorksContent) {
    return await fetchApi<GroupsResponse>(
      `https://www.worksapis.com/v1.0/bots/${ this.userBotId }/users/${ userId }/messages`,
      "POST",
      { content },
      false,
      this.accessToken,
      null,
    );
  }

  public async postChannelMessage(channelId: string, content: LineWorksContent) {
    return await fetchApi<GroupsResponse>(
      `https://www.worksapis.com/v1.0/bots/${ this.channelBotId }/channels/${ channelId }/messages`,
      "POST",
      { content },
      false,
      this.accessToken,
      null,
    );
  }
}
