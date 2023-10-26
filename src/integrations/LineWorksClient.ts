import { Service } from "typedi";

import { ImplementedChatToolRepository } from "@/repositories/settings/ImplementedChatToolRepository";
import { ChatToolId } from "@/consts/common";
import { ISelectItem } from "@/types/app";
import { IsNull, Not } from "typeorm";
import { fetchApi } from "@/libs/request";
import { AuthLineWorksResponse, BotResponse, BotsResponse, ChannelResponse, GroupsResponse, InstallationLineWorks, LineWorksContent, UsersResponse } from "@/types/lineworks";
import ImplementedChatTool from "@/entities/settings/ImplementedChatTool";
import logger from "@/libs/logger";
import LineWorksRepository from "@/repositories/LineWorksRepository";

@Service()
export default class LineWorksClient {
  private companyId: string;
  private accessToken?: string;
  private botId?: string;

  public static async initFromInfo(lineWorksInfo: ImplementedChatTool): Promise<LineWorksClient> {
    const service = new LineWorksClient();
    service.accessToken = lineWorksInfo?.accessToken;
    service.companyId = lineWorksInfo.companyId;
    service.botId = lineWorksInfo?.botId;
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
    service.botId = lineWorksInfo?.botId;
    return service;
  }


  private async callUsersApi(count: number, cursor: string): Promise<UsersResponse> {
    return await this.callApiWithRetryAuth(async () => {
      return await fetchApi<UsersResponse>(
        "https://www.worksapis.com/v1.0/users",
        "GET",
        { count, cursor },
        false,
        this.accessToken,
        null,
      );
    }, 3);
  }

  private async callGroupsApi(count: number, cursor: string): Promise<GroupsResponse> {
    return await this.callApiWithRetryAuth(async () => {
      return await fetchApi<GroupsResponse>(
        "https://www.worksapis.com/v1.0/groups",
        "GET",
        { count, cursor },
        false,
        this.accessToken,
        null,
      );

    }, 3);
  }

  private async callBotsApi(count: number, cursor: string): Promise<BotsResponse> {
    return await this.callApiWithRetryAuth(async () => {
      return await fetchApi<BotsResponse>(
        "https://www.worksapis.com/v1.0/bots",
        "GET",
        { count, cursor },
        false,
        this.accessToken,
        null,
      );
    }, 3);
  }

  private async callBotApi(botId: string): Promise<BotResponse> {
    return await this.callApiWithRetryAuth(async () => {
      return await fetchApi<BotResponse>(
        `https://www.worksapis.com/v1.0/bots/${ botId }`,
        "GET",
        { },
        false,
        this.accessToken,
        null,
      );
    }, 3);
  }

  private async callChannelApi(botId: string, channelId: string): Promise<ChannelResponse> {
    return await this.callApiWithRetryAuth(async () => {
      return await fetchApi<ChannelResponse>(
        `https://www.worksapis.com/v1.0/bots/${ botId }/channels/${ channelId }`,
        "GET",
        {},
        false,
        this.accessToken,
        null,
      );
    }, 3);
  }

  private async callChannelMembersApi(botId: string, channelId: string, count: number, cursor: string): Promise<ChannelResponse> {
    return await this.callApiWithRetryAuth(async () => {
      return await fetchApi<ChannelResponse>(
        `https://www.worksapis.com/v1.0/bots/${ botId }/channels/${ channelId }/members`,
        "GET",
        { count, cursor },
        false,
        this.accessToken,
        null,
      );
    }, 3);
  }

  private async callApiWithRetryAuth(apiCall: any, retryTimes: number) {
    try {
      return await apiCall();
    } catch (error) {
      const res = JSON.parse(error.message);
      if (res.code === "UNAUTHORIZED") {
        //Retry refresh token
        logger.warn(`Retrying authentication: ${ error.message }`);
        return await this.retryRefreshToken(retryTimes, async () => {
          return await apiCall();
        }, async () => {
          return await this.retryRenewToken(retryTimes, async () => {
            return await apiCall();
          });
        });
      }
      throw error;
    }
  }

  private async callReissueTokenApi(lineWorksInfo: ImplementedChatTool): Promise<AuthLineWorksResponse> {
    const formdata = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: lineWorksInfo.clientId,
      client_secret: lineWorksInfo.clientSecret,
      refresh_token: lineWorksInfo.refreshToken,
    });
    return await fetchApi<AuthLineWorksResponse>(
      "https://auth.worksmobile.com/oauth2/v2.0/token",
      "POST",
      formdata,
      true,
      null,
      null,
    );
  }

  private async callRenewTokenApi(lineWorksInfo: ImplementedChatTool): Promise<InstallationLineWorks> {
    const CLIENT_ID = lineWorksInfo.clientId;
    const CLIENT_SECRET = lineWorksInfo.clientSecret;
    const SERVICE_ACCOUNT = lineWorksInfo.serviceAccount;
    const PRIVATE_KEY = lineWorksInfo.secretKey;

    const assertion = LineWorksRepository.getJWT(CLIENT_ID, SERVICE_ACCOUNT, PRIVATE_KEY);
    const formdata = new URLSearchParams({
      assertion: assertion,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "bot user.read group.read bot.message bot.read",
    });
    return fetchApi<InstallationLineWorks>(
      "https://auth.worksmobile.com/oauth2/v2.0/token",
      "POST",
      formdata,
      true,
      null,
      null,
    );
  }

  public async retryRefreshToken(tryRemain: number, callback: any, execeedRetryCallback: any) {
    logger.warn("Retry refresh token");
    const lineWorksInfo = await ImplementedChatToolRepository.findOneBy({
      companyId: this.companyId,
      chatToolId: ChatToolId.LINEWORKS,
      accessToken: Not(IsNull()),
    });

    try {
      const response = await this.callReissueTokenApi(lineWorksInfo);
      if (response.access_token) {
        lineWorksInfo.accessToken = response.access_token;
        this.accessToken = response.access_token;
        await ImplementedChatToolRepository.upsert(lineWorksInfo, []);
        if (callback) {
          return await callback();
        }
      }
      else {
        if (execeedRetryCallback) {
          return await execeedRetryCallback();
        }
      }
    } catch (error) {
      if (tryRemain <= 1) {
        if (execeedRetryCallback) {
          return await execeedRetryCallback();
        }
        throw error;
      }
      else {
        return await this.retryRefreshToken(tryRemain - 1, callback, execeedRetryCallback);
      }
    }
  }

  public async retryRenewToken(tryRemain: number, callback: any) {
    logger.warn("Retry renew token");
    const lineWorksInfo = await ImplementedChatToolRepository.findOneBy({
      companyId: this.companyId,
      chatToolId: ChatToolId.LINEWORKS,
      accessToken: Not(IsNull()),
    });

    try {
      const response = await this.callRenewTokenApi(lineWorksInfo);
      if (response.access_token) {
        lineWorksInfo.accessToken = response.access_token;
        lineWorksInfo.refreshToken = response.refresh_token;
        lineWorksInfo.installation = response as InstallationLineWorks;
        this.accessToken = response.access_token;
        await ImplementedChatToolRepository.upsert(lineWorksInfo, []);
        if (callback) {
          return callback();
        }
      }
    } catch (error) {
      if (tryRemain <= 1) {
        throw error;
      }
      else {
        return this.retryRenewToken(tryRemain - 1, callback);
      }
    }
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

  public async getBots(botType: string): Promise<ISelectItem<string>[]> {
    const bots: BotResponse[] = [];
    const limit = 100;
    let cursor: string = "";
    do {
      const response = await this.callBotsApi(limit, cursor);
      const extraBots = await Promise.all(response.bots.map(async (bot) => {
        return await this.callBotApi(bot.botId);
      }));
      bots.push(...extraBots);
      cursor = response.responseMetaData.nextCursor;
    } while (cursor);



    return bots.filter(bot => botType === "group" ? bot.enableGroupJoin : !bot.enableGroupJoin)
      .map(bot => ({
        id: bot.botId,
        name: bot.botName || "N/A",
      }));
  }

  public async getChannelInfo(botId: string, channelId: string): Promise<ChannelResponse> {
    const limit = 100;
    const cursor: string = "";

    try {
      return await this.callChannelApi(botId, channelId);
    } catch (error) {
      logger.error(error.message);
      return await this.callChannelMembersApi(botId, channelId, limit, cursor);
    }
  }

  public async postUserMessage(userId: string, content: LineWorksContent) {
    return await this.callApiWithRetryAuth(async () => {
      return await fetchApi<GroupsResponse>(
        `https://www.worksapis.com/v1.0/bots/${ this.botId }/users/${ userId }/messages`,
        "POST",
        content,
        false,
        this.accessToken,
        null,
      );
    }, 3);
  }

  public async postChannelMessage(channelId: string, content: LineWorksContent) {
    return await this.callApiWithRetryAuth(async () => {
      return await fetchApi<GroupsResponse>(
        `https://www.worksapis.com/v1.0/bots/${ this.botId }/channels/${ channelId }/messages`,
        "POST",
        content,
        false,
        this.accessToken,
        null,
      );
    }, 3);
  }
}
