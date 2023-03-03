import { Container, Service } from "typedi";
import { In, Repository } from "typeorm";
import { Message, Profile } from "@line/bot-sdk";
import moment from "moment";

import ChatMessage from "@/entities/transactions/ChatMessage";
import ChatTool from "@/entities/masters/ChatTool";
import LineProfile from "@/entities/transactions/LineProfile";
import ReportingLine from "@/entities/settings/ReportingLine";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";
import DailyReportConfig from "@/entities/settings/DailyReportConfig";

import CommonRepository from "./modules/CommonRepository";

import { LoggerError } from "@/exceptions";
import LineMessageBuilder from "@/common/LineMessageBuilder";
import LineBot from "@/config/line-bot";
import AppDataSource from "@/config/data-source";
import logger from "@/logger/winston";
import { toJapanDateTime } from "@/utils/common";
import {
  MessageTriggerType,
  MessageType,
  OpenStatus,
  RemindType,
  ReplyStatus,
  SenderType,
} from "@/consts/common";

import { IRemindType, ITodoLines } from "@/types";

@Service()
export default class LineRepository {
  private lineProfileRepository: Repository<LineProfile>;
  private userRepository: Repository<User>;
  private messageRepository: Repository<ChatMessage>;
  private todoRepository: Repository<Todo>;
  private dailyReportConfigRepository: Repository<DailyReportConfig>;
  private commonRepository: CommonRepository;

  constructor() {
    this.lineProfileRepository = AppDataSource.getRepository(LineProfile);
    this.userRepository = AppDataSource.getRepository(User);
    this.messageRepository = AppDataSource.getRepository(ChatMessage);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.dailyReportConfigRepository = AppDataSource.getRepository(DailyReportConfig);
    this.commonRepository = Container.get(CommonRepository);
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

      //1.期日に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_BY_DEADLINE,
        remindDays: remindDays,
      };

      const messageToken = await LineBot.getLinkToken(user.lineId);
      const message = LineMessageBuilder.createRemindMessage(messageToken, user.name, todo, remindDays);
      const chatMessage = await this.saveChatMessage(
        chatTool,
        message,
        MessageTriggerType.REMIND,
        messageToken,
        user,
        remindTypes,
        todo,
      );

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

  public async createLineProfile(lineProfile: Profile): Promise<LineProfile> {
    try {
      const findResult = await this.lineProfileRepository.findOneBy({
        line_id: lineProfile.userId,
      });

      if (!findResult) {
        const profile = new LineProfile();
        profile.line_id = lineProfile.userId;
        profile.display_name = lineProfile.displayName;
        profile.picture_url = lineProfile.pictureUrl;
        profile.status_message = lineProfile.statusMessage;

        return await this.lineProfileRepository.save(profile);
      } // find by id

      return findResult;
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  public async getUserFromLineId(lineId: string): Promise<User> {
    // Get user by line id
    const users = await this.commonRepository.getChatToolUserByUserId(lineId);

    if (!users.length) {
      return Promise.resolve(null);
    }

    return users[0];
  }

  public async getSuperiorUsers(lineId: string): Promise<User[]> {
    // Get user by line id
    const users = await this.commonRepository.getChatToolUserByUserId(lineId);

    if (!users.length) {
      return Promise.resolve([]);
    }

    const userIds: number[] = users.map((user) => user.id).filter(Number);

    const reportingLineRepository = AppDataSource.getRepository(ReportingLine);
    const superiorUserIds = await reportingLineRepository.findBy({
      subordinate_user_id: In(userIds),
    });

    if (superiorUserIds.length === 0) {
      return Promise.resolve([]);
    }

    return await this.userRepository
      .createQueryBuilder("users")
      .where("id IN (:...ids)", {
        ids: superiorUserIds.map(superiorUserId => superiorUserId.superior_user_id),
      })
      .getMany();
  }

  public async createMessage(chatMessage: ChatMessage): Promise<ChatMessage> {
    try {
      return await this.messageRepository.save(chatMessage);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  public async findMessageById(id: number): Promise<ChatMessage> {
    try {
      return await this.messageRepository.findOneBy({ id });
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
      console.log(LineMessageBuilder.getTextContentFromMessage(message));
    } else {
      const pushTarget = groupId ? groupId : user.lineId;

      await LineBot.pushMessage(pushTarget, message, false);
      if (user) {
        const linkToken = await LineBot.getLinkToken(user.lineId);
        return await this.saveChatMessage(chatTool, message, messageTriggerId, linkToken, user, remindTypes);
      }
      return await this.saveChatMessage(chatTool, message, messageTriggerId, null, user, remindTypes);
    }
  }

  public async replyMessage(
    chatTool: ChatTool,
    replyToken: string,
    message: Message,
    user?: User,
  ): Promise<any> {
    if (process.env.ENV === "LOCAL") {
      console.log(LineMessageBuilder.getTextContentFromMessage(message));
    } else {
      await LineBot.replyMessage(replyToken, message);
    }
    return await this.saveChatMessage(chatTool, message, MessageTriggerType.RESPONSE, replyToken, user);
  }

  public async pushTodoLine(todoLine: ITodoLines): Promise<ChatMessage> {
    const { todo, chattool, user, remindDays } = todoLine;
    return await this.pushMessageRemind(chattool, user, todo, remindDays);
  }

  public async saveChatMessage(
    chatTool: ChatTool,
    message: Message,
    messageTriggerId: number,
    messageToken: string,
    user?: User,
    remindTypes?: IRemindType,
    todo?: Todo,
  ): Promise<ChatMessage> {
    const { remindType, remindDays } = {
      remindType: RemindType.NOT_REMIND,
      remindDays: null,
      ...remindTypes,
    };

    const chatMessage = new ChatMessage();
    chatMessage.is_from_user = SenderType.FROM_BOT;
    chatMessage.chattool_id = chatTool.id;
    chatMessage.is_opened = OpenStatus.OPENED;
    chatMessage.is_replied = ReplyStatus.NOT_REPLIED;
    chatMessage.message_trigger_id = messageTriggerId; // batch
    chatMessage.message_type_id = MessageType.FLEX;

    chatMessage.body = LineMessageBuilder.getTextContentFromMessage(message);
    chatMessage.todo_id = todo?.id;
    chatMessage.send_at = toJapanDateTime(moment().utc().toDate());
    chatMessage.user_id = user?.id;
    chatMessage.message_token = messageToken;
    chatMessage.remind_type = remindType;
    chatMessage.remind_before_days = remindDays;

    return await this.messageRepository.save(chatMessage);
  }
}