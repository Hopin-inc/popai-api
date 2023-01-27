import { Container, Service } from "typedi";
import { In, Repository } from "typeorm";
import { Message, Profile } from "@line/bot-sdk";
import moment from "moment";

import ChatMessage from "@/entities/ChatMessage";
import ChatTool from "@/entities/ChatTool";
import LineProfile from "@/entities/LineProfile";
import ReportingLine from "@/entities/ReportingLine";
import Todo from "@/entities/Todo";
import User from "@/entities/User";

import CommonRepository from "./modules/CommonRepository";

import { LoggerError } from "@/exceptions";
import LineMessageBuilder from "@/common/LineMessageBuilder";
import LineBot from "@/config/line-bot";
import AppDataSource from "@/config/data-source";
import logger from "@/logger/winston";
import { toJapanDateTime } from "@/utils/common";
import { MessageTriggerType, MessageType, OpenStatus, RemindType, ReplyStatus, SenderType } from "@/consts/common";

import { IChatTool, IRemindType, ITodo, ITodoLines, IUser } from "@/types";

@Service()
export default class LineRepository {
  private lineProfileRepository: Repository<LineProfile>;
  private userRepository: Repository<User>;
  private messageRepository: Repository<ChatMessage>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;

  constructor() {
    this.lineProfileRepository = AppDataSource.getRepository(LineProfile);
    this.userRepository = AppDataSource.getRepository(User);
    this.messageRepository = AppDataSource.getRepository(ChatMessage);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.commonRepository = Container.get(CommonRepository);
  }

  pushMessageRemind = async (
    chattool: IChatTool,
    user: IUser,
    todo: ITodo,
    remindDays: number
  ): Promise<ChatMessage> => {
    try {
      if (!user.line_id) {
        logger.error(new LoggerError(user.name + "がLineIDが設定されていない。"));
        return;
      }

      //1.期日に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_BY_DEADLINE,
        remindDays: remindDays,
      };

      const messageToken = await LineBot.getLinkToken(user.line_id);
      const message = LineMessageBuilder.createRemindMessage(messageToken, user.name, todo, remindDays);
      const chatMessage = await this.saveChatMessage(
        chattool,
        message,
        MessageTriggerType.BATCH,
        messageToken,
        user,
        remindTypes,
        todo
      );

      const messageForSend = LineMessageBuilder.createRemindMessage(
        chatMessage.message_token,
        user.name,
        todo,
        remindDays
      );

      if (process.env.ENV === "LOCAL") {
        // console.log(LineMessageBuilder.getTextContentFromMessage(messageForSend));
        console.log(messageForSend);
      } else {
        await LineBot.pushMessage(user.line_id, messageForSend, false);
      }

      return chatMessage;
    } catch (error) {
      console.log("user", user);
      console.log("todo", todo);
      logger.error(new LoggerError(error.message));
    }
  };

  pushMessageStartRemindToUser = async (todoLines: ITodoLines[]): Promise<any> => {
    try {
      const user = todoLines[0].user;
      const chattool = todoLines[0].chattool;

      if (!user.line_id) {
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
          await this.pushLineMessage(chattool, user, message, MessageTriggerType.ACTION);
        }
      }

      return;
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  pushStartReportToSuperior = async (chattool: ChatTool, superiorUser: IUser): Promise<any> => {
    try {
      // if (!user.line_id) {
      //   logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));
      //   return;
      // }

      // consts superiorUsers = await this.getSuperiorUsers(user.line_id);

      if (!superiorUser.line_id) {
        logger.error(new LoggerError(superiorUser.name + "がLineIDが設定されていない。"));
      } else {
        const message = LineMessageBuilder.createBeforeReportMessage(superiorUser.name);
        await this.pushLineMessage(chattool, superiorUser, message, MessageTriggerType.ACTION);
      }

      return;
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  /**
   * 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
   * @param chattool
   * @param user
   * @param todos
   * @returns
   */
  pushListTaskMessageToAdmin = async (
    chattool: ChatTool,
    user: IUser,
    todos: ITodo[]
  ): Promise<any> => {
    try {
      if (!user.line_id) {
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
        chattool,
        user,
        message,
        MessageTriggerType.BATCH,
        remindTypes
      );
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  /**
   * 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
   * @param chattool
   * @param user
   * @param todos
   * @returns
   */
  pushNotAssignListTaskMessageToAdmin = async (
    chattool: ChatTool,
    user: IUser,
    todos: ITodo[]
  ): Promise<any> => {
    try {
      if (!user.line_id) {
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
        chattool,
        user,
        message,
        MessageTriggerType.BATCH,
        remindTypes
      );
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  /**
   * 期日未設定のタスク一覧が1つのメッセージで担当者に送られること
   * @param chattool
   * @param user
   * @param todos
   * @returns
   */
  pushListTaskMessageToUser = async (
    chattool: ChatTool,
    user: IUser,
    todos: ITodo[]
  ): Promise<any> => {
    try {
      if (!user.line_id) {
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
        chattool,
        user,
        message,
        MessageTriggerType.BATCH,
        remindTypes
      );
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  /**
   * 期日未設定のタスクがない旨のメッセージが管理者に送られること
   * @param chattool
   * @param user
   * @returns
   */
  pushNoListTaskMessageToAdmin = async (chattool: ChatTool, user: IUser): Promise<any> => {
    try {
      if (!user.line_id) {
        logger.error(new LoggerError(user.name + "がLineIDが設定されていない。"));

        return;
      }

      const message = LineMessageBuilder.createNotifyNothingMessage(user);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushLineMessage(chattool, user, message, MessageTriggerType.BATCH);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  createLineProfile = async (lineProfile: Profile): Promise<LineProfile> => {
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
  };

  getUserFromLineId = async (lineId: string): Promise<User> => {
    // Get user by line id
    const users = await this.commonRepository.getChatToolUserByUserId(lineId);

    if (!users.length) {
      return Promise.resolve(null);
    }

    return users[0];
  };

  getSuperiorUsers = async (lineId: string): Promise<Array<User>> => {
    // Get user by line id
    const users = await this.commonRepository.getChatToolUserByUserId(lineId);

    if (!users.length) {
      return Promise.resolve([]);
    }

    const userIds: number[] = users.map((user) => user.id).filter(Number);

    // Get supervisords

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
  };

  getSuperiorOfUsers = async (userIds: number[]): Promise<Array<User>> => {
    if (!userIds.length) return [];

    const reportingLineRepository = AppDataSource.getRepository(ReportingLine);
    const superiorUserIds = await reportingLineRepository
      .createQueryBuilder("reporting_lines")
      .where("subordinate_user_id IN (:...ids)", {
        ids: userIds,
      })
      .getMany();

    if (superiorUserIds.length === 0) {
      return Promise.resolve([]);
    }

    const userIdList = superiorUserIds.map((superiorUserId) => superiorUserId.superior_user_id);

    return await this.userRepository
      .createQueryBuilder("users")
      .where("id IN (:...ids)", { ids: userIdList })
      .getMany();
  };

  createMessage = async (chatMessage: ChatMessage): Promise<ChatMessage> => {
    try {
      return await this.messageRepository.save(chatMessage);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  findMessageById = async (id: number): Promise<ChatMessage> => {
    try {
      return await this.messageRepository.findOneBy({ id });
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  pushLineMessage = async (
    chattool: IChatTool,
    user: IUser,
    message: Message,
    messageTriggerId: number,
    remindTypes?: IRemindType
  ): Promise<any> => {
    if (process.env.ENV === "LOCAL") {
      console.log(LineMessageBuilder.getTextContentFromMessage(message));
    } else {
      await LineBot.pushMessage(user.line_id, message, false);
    }

    const linkToken = await LineBot.getLinkToken(user.line_id);
    
    return await this.saveChatMessage(chattool, message, messageTriggerId, linkToken, user, remindTypes);
  };

  replyMessage = async (
    chattool: ChatTool,
    replyToken: string,
    message: Message,
    user?: User
  ): Promise<any> => {
    if (process.env.ENV === "LOCAL") {
      console.log(LineMessageBuilder.getTextContentFromMessage(message));
    } else {
      await LineBot.replyMessage(replyToken, message);
    }

    return await this.saveChatMessage(chattool, message, MessageTriggerType.ACTION, replyToken, user);
  };

  pushTodoLine = async (todoLine: ITodoLines): Promise<ChatMessage> => {
    const { todo, chattool, user, remindDays } = todoLine;
    return await this.pushMessageRemind(
      chattool,
      user,
      { ...todo, assigned_user_id: user.id },
      remindDays
    );
  };

  saveChatMessage = async (
    chattool: IChatTool,
    message: Message,
    messageTriggerId: number,
    messageToken: string,
    user?: IUser,
    remindTypes?: IRemindType,
    todo?: ITodo
  ): Promise<ChatMessage> => {
    const { remindType, remindDays } = {
      remindType: RemindType.NOT_REMIND,
      remindDays: null,
      ...remindTypes,
    };

    const chatMessage = new ChatMessage();
    chatMessage.is_from_user = SenderType.FROM_BOT;
    chatMessage.chattool_id = chattool.id;
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
  };
}