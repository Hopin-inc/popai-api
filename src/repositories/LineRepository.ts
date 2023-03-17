import { Service } from "typedi";
import { In } from "typeorm";
import { FlexComponent, Message } from "@line/bot-sdk";

import ChatMessage from "@/entities/transactions/ChatMessage";
import ChatTool from "@/entities/masters/ChatTool";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";

import { LoggerError } from "@/exceptions";
import LineMessageBuilder from "@/common/LineMessageBuilder";
import LineBot from "@/config/line-bot";
import logger from "@/logger/winston";
import {
  MessageTriggerType,
  MessageType,
  RemindType,
} from "@/consts/common";

import { IDailyReportItems, IRemindType, ITodoLines } from "@/types";
import Company from "@/entities/settings/Company";
import Section from "@/entities/settings/Section";
import { INotionDailyReport } from "@/types/notion";
import DailyReport from "@/entities/transactions/DailyReport";
import { UserRepository } from "@/repositories/settings/UserRepository";
import { DailyReportRepository } from "@/repositories/transactions/DailyReportRepository";
import { ChatMessageRepository } from "@/repositories/transactions/ChatMessageRepository";
import { ReportingLineRepository } from "@/repositories/settings/ReportingLineRepository";

@Service()
export default class LineRepository {
  public async reportByCompany(
    dailyReportTodos: IDailyReportItems,
    company: Company,
    sections: Section[],
    users: User[],
    chatTool: ChatTool,
    channel: string,
    response: INotionDailyReport[],
  ) {
    await this.pushLineMessage(
      chatTool,
      LineMessageBuilder.createGreetingMessage(),
      MessageTriggerType.DAILY_REPORT,
      null,
      null,
      channel);

    const message = await LineMessageBuilder.createDailyReportByCompany(users, dailyReportTodos, response);
    await this.pushLineMessage(
      chatTool,
      message,
      MessageTriggerType.DAILY_REPORT,
      null,
      null,
      channel);

    await this.pushLineMessage(
      chatTool,
      LineMessageBuilder.createActivateMessage(),
      MessageTriggerType.DAILY_REPORT,
      null,
      null,
      channel);

    users.map(async user => {
      const filteredRes = response.find(r => user.todoAppUsers.map(tu => tu.user_app_id === r.assignee));
      const dailyReport = new DailyReport(user, company, sections, dailyReportTodos, channel, null, filteredRes.pageId, filteredRes.docAppRegUrl);
      await DailyReportRepository.save(dailyReport);
    });
  }

  public async pushMessageRemind(
    chatTool: ChatTool,
    user: User,
    todo: Todo,
    remindDays: number,
  ): Promise<ChatMessage> {
    try {
      if (!user.lineId) {
        logger.error(new LoggerError(user.name + "がLineIDが設定されていない。"));
        return;
      }

      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_BY_DEADLINE,
        remindDays: remindDays,
      };

      const messageToken = await LineBot.getLinkToken(user.lineId);
      const message = LineMessageBuilder.createRemindMessage(messageToken, user.name, todo, remindDays);
      const chatMessage = new ChatMessage(
        chatTool,
        this.getTextContentFromMessage(message),
        MessageTriggerType.REMIND,
        MessageType.FLEX,
        user,
        null,
        null,
        remindTypes,
        todo,
        messageToken,
      );
      await ChatMessageRepository.save(chatMessage);

      const messageForSend = LineMessageBuilder.createRemindMessage(
        chatMessage.message_token,
        user.name,
        todo,
        remindDays,
      );

      if (process.env.ENV === "LOCAL") {
        // console.log(LineMessageBuilder.getTextContentFromMessage(messageForSend));
        console.log(messageForSend);
      } else {
        await LineBot.pushMessage(user.lineId, messageForSend, false);
      }

      return chatMessage;
    } catch (error) {
      console.log("user", user);
      console.log("todo", todo);
      logger.error(new LoggerError(error.message));
    }
  }

  public async pushMessageStartRemindToUser(todoLines: ITodoLines[]): Promise<any> {
    try {
      const user = todoLines[0].user;
      const chatTool = todoLines[0].chattool;

      if (!user.lineId) {
        logger.error(new LoggerError(user.name + "がLineIDが設定されていない。"));
        return;
      }

      //1.期日に対するリマインド
      const messages = LineMessageBuilder.createBeforeRemindMessage(user, todoLines);

      if (process.env.ENV === "LOCAL") {
        // console.log(LineMessageBuilder.getTextContentFromMessage(messageForSend));
        console.log(messages);
      } else {
        for (const message of messages) {
          await this.pushLineMessage(chatTool, message, MessageTriggerType.REMIND, user);
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  public async pushStartReportToSuperior(chatTool: ChatTool, superiorUser: User): Promise<any> {
    try {
      if (!superiorUser.lineId) {
        logger.error(new LoggerError(superiorUser.name + "がLineIDが設定されていない。"));
      } else {
        const message = LineMessageBuilder.createBeforeReportMessage(superiorUser.name);
        await this.pushLineMessage(chatTool, message, MessageTriggerType.REPORT, superiorUser);
      }

      return;
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  /**
   * 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
   * @param chatTool
   * @param user
   * @param todos
   * @returns
   */
  public async pushListTaskMessageToAdmin(chatTool: ChatTool, user: User, todos: Todo[]): Promise<any> {
    try {
      if (!user.lineId) {
        logger.error(new LoggerError(user.name + "がLineIDが設定されていない。"));
        return;
      }

      //4. 担当者・期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_ASSIGN_DEADLINE,
      };

      const message = LineMessageBuilder.createNotifyUnsetMessage(todos);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushLineMessage(
        chatTool,
        message,
        MessageTriggerType.REMIND,
        user,
        remindTypes,
      );
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  /**
   * 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
   * @param chatTool
   * @param user
   * @param todos
   * @returns
   */
  public async pushNotAssignListTaskMessageToAdmin(chatTool: ChatTool, user: User, todos: Todo[]): Promise<any> {
    try {
      if (!user.lineId) {
        logger.error(new LoggerError(user.name + "がLineIDが設定されていない。"));
        return;
      }

      //2. 担当者・期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_ASSIGN,
      };

      const message = LineMessageBuilder.createNotifyUnassignedMessage(todos);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushLineMessage(
        chatTool,
        message,
        MessageTriggerType.REMIND,
        user,
        remindTypes,
      );
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  /**
   * 期日未設定のタスク一覧が1つのメッセージで担当者に送られること
   * @param chatTool
   * @param user
   * @param todos
   * @returns
   */
  public async pushListTaskMessageToUser(chatTool: ChatTool, user: User, todos: Todo[]): Promise<any> {
    try {
      if (!user.lineId) {
        logger.error(new LoggerError(user.name + "がLineIDが設定されていない。"));
        return;
      }

      //3. 期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_DEADLINE,
      };

      const message = LineMessageBuilder.createNotifyNoDeadlineMessage(todos);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushLineMessage(
        chatTool,
        message,
        MessageTriggerType.REMIND,
        user,
        remindTypes,
      );
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  /**
   * 期日未設定のタスクがない旨のメッセージが管理者に送られること
   * @param chatTool
   * @param user
   * @returns
   */
  public async pushNoListTaskMessageToAdmin(chatTool: ChatTool, user: User): Promise<any> {
    try {
      if (!user.lineId) {
        logger.error(new LoggerError(user.name + "がLineIDが設定されていない。"));

        return;
      }

      const message = LineMessageBuilder.createNotifyNothingMessage(user);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushLineMessage(chatTool, message, MessageTriggerType.REMIND, user);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  public async getUserFromLineId(lineId: string): Promise<User> {
    // Get user by line id
    const users = await UserRepository.getChatToolUserByUserId(lineId);

    if (!users.length) {
      return Promise.resolve(null);
    }

    return users[0];
  }

  public async getSuperiorUsers(lineId: string): Promise<User[]> {
    // Get user by line id
    const users = await UserRepository.getChatToolUserByUserId(lineId);

    if (!users.length) {
      return Promise.resolve([]);
    }

    const userIds: number[] = users.map((user) => user.id).filter(Number);

    const superiorUserIds = await ReportingLineRepository.findBy({
      subordinate_user_id: In(userIds),
    });

    if (superiorUserIds.length === 0) {
      return Promise.resolve([]);
    }

    return await UserRepository.getSuperiorUser(superiorUserIds);
  }

  public async createMessage(chatMessage: ChatMessage): Promise<ChatMessage> {
    try {
      return await ChatMessageRepository.save(chatMessage);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  public async findMessageById(id: number): Promise<ChatMessage> {
    try {
      return await ChatMessageRepository.findOneBy({ id });
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  public async pushLineMessage(
    chatTool: ChatTool,
    message: Message,
    messageTriggerId: number,
    user?: User,
    remindTypes?: IRemindType,
    groupId?: string,
  ): Promise<any> {
    if (process.env.ENV === "LOCAL") {
      console.log(this.getTextContentFromMessage(message));
    } else {
      const linkToken = user ? await LineBot.getLinkToken(user.lineId) : null;
      const chatMessage = new ChatMessage(
        chatTool,
        this.getTextContentFromMessage(message),
        messageTriggerId,
        MessageType.FLEX,
        user,
        groupId,
        null,
        remindTypes,
        null,
        linkToken,
      );
      return await ChatMessageRepository.save(chatMessage);
    }
  }

  public async replyMessage(
    chatTool: ChatTool,
    replyToken: string,
    message: Message,
    user?: User,
  ): Promise<any> {
    if (process.env.ENV === "LOCAL") {
      console.log(this.getTextContentFromMessage(message));
    } else {
      await LineBot.replyMessage(replyToken, message);
    }
    const chatMessage = new ChatMessage(
      chatTool,
      this.getTextContentFromMessage(message),
      MessageTriggerType.RESPONSE,
      MessageType.TEXT,
      user,
      null,
      null,
      null,
      null,
      replyToken,
    );
    return await ChatMessageRepository.save(chatMessage);
  }

  public async pushTodoLine(todoLine: ITodoLines): Promise<ChatMessage> {
    const { todo, chattool, user, remindDays } = todoLine;
    return await this.pushMessageRemind(chattool, user, todo, remindDays);
  }

  private getTextContentFromMessage(message: Message): string {
    switch (message.type) {
      case "text":
        return message.text;

      case "flex":
        const texts = [];
        const findText = (components: FlexComponent[]) => {
          components.forEach(component => {
            switch (component.type) {
              case "text":
                if (component.text) {
                  texts.push(component.text);
                } else if (component.contents) {
                  findText(component.contents);
                }
                break;
              case "span":
                const lastText = texts.pop();
                texts.push(lastText + component.text);
                break;
              case "box":
                if (component.contents) {
                  findText(component.contents);
                }
                break;
              default:
                break;
            }
          });
        };

        const messageContents = message.contents;
        if (messageContents.type === "bubble") {
          const flexComponents = messageContents.body?.contents ?? [];
          findText(flexComponents);
        }
        return texts.join("\n");

      case "audio":
        return message.originalContentUrl;

      case "image":
        return message.originalContentUrl;

      case "imagemap":
        return message.baseUrl;

      case "location":
        return message.address;

      case "sticker":
        return message.packageId;

      case "template":
        return message.altText;

      case "video":
        return message.originalContentUrl;

      default:
        return "";
    }
  }
}