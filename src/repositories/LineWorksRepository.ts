import axios from "axios";
import { Request } from "express";
import jwt from "jsonwebtoken";
import { Service } from "typedi";

import LineWorksMessageBuilder from "@/common/LineWorksMessageBuilder";
import { ChatToolId, RemindType } from "@/consts/common";
import Company from "@/entities/settings/Company";
import RemindConfig from "@/entities/settings/RemindConfig";
import RemindTiming from "@/entities/settings/RemindTiming";
import User from "@/entities/settings/User";
import Project from "@/entities/transactions/Project";
import Todo from "@/entities/transactions/Todo";
import LineWorksClient from "@/integrations/LineWorksClient";
import logger from "@/libs/logger";

import { ProjectRepository } from "./transactions/ProjectRepository";
import { TodoRepository } from "./transactions/TodoRepository";

@Service()
export default class LineWorksRepository {
  static getInstallation: any;

  private async sendDirectMessage(user: User, message: any) {
    if (user && user.chatToolUser?.chatToolId === ChatToolId.LINEWORKS && user.chatToolUser?.appUserId) {
      const lineWorksBot = await LineWorksClient.init(user.companyId);
      return lineWorksBot.postDirectMessage(user.chatToolUser.appUserId, message.content);
    }
  }

  private async pushLineWorksMessage(companyId: string, sharedMessage: any, channelId: string) {
    const lineWorksBot = await LineWorksClient.init(companyId);
    return lineWorksBot.postMessage(companyId, sharedMessage, channelId);
  }

  public async getInstallation(req: Request) {
    const CLIENT_ID = req.body.client_id;
    const CLIENT_SECRET = req.body.client_secret;
    const SERVICE_ACCOUNT = req.body.service_account;
    const PRIVATE_KEY = req.body.secret_key;

    const assertion = await this.getJWT(CLIENT_ID, SERVICE_ACCOUNT, PRIVATE_KEY);

    const uri = "https://auth.worksmobile.com/oauth2/v2.0/token";

    const params = new URLSearchParams({
      assertion: assertion,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: "bot user.read group.read bot.message bot.read",
    });

    axios.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded;";

    //https Post Request
    return await axios
      .post(uri, params)
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        if (error.response) {
          logger.info(`res state: ${ error.response.statusText } ${ error.response.status }`);
          logger.error(`res header: ${ error.response.headers }`);
          logger.error(`res data: ${ JSON.stringify(error.response.data) }`);
        } else if (error.request) {
          logger.error(error.request);
        } else {
          logger.error(error.message);
        }
        logger.error(JSON.stringify(error.config));
        return error;
      });
  }

  /**
   * JWT の生成
   * JWT の形式
   * {Header BASE64 エンコード}.{JSON Claims Set BASE64 エンコード}.{signature BASE64 エンコード}
   */
  private async getJWT(clientId: string, serviceAccount: string, privateKey: string) {
    const current_time = Date.now() / 1000;
    const jws = jwt.sign(
      {
        iss: clientId,
        sub: serviceAccount,
        iat: current_time,
        exp: current_time + 60 * 60, // 1 hour
      },
      privateKey,
      { algorithm: "RS256" },
    );

    return jws;
  }

  public async remind(company: Company, timing: RemindTiming, config: RemindConfig) {
    const items: (Todo | Project)[] =
      config.type === RemindType.PROJECTS
        ? await TodoRepository.getRemindTodos(company.id, true, config.limit)
        : await ProjectRepository.getRemindProjects(company.id, true, config.limit);
    if (items.length) {
      const sharedMessage = LineWorksMessageBuilder.createPublicRemind(items);
      await Promise.all([
        ...company.users.map(async (user) => {
          const assignedItems = items.filter((i) => i.users.map((u) => u.id).includes(user.id));
          if (assignedItems.length) {
            const message = LineWorksMessageBuilder.createPersonalRemind(assignedItems);
            await this.sendDirectMessage(user, message);
          }
        }),
        this.pushLineWorksMessage(company.id, sharedMessage, config.channel),
      ]);
    }
  }
}
