import { LoggerError } from '../exceptions';
import { Service, Container } from 'typedi';
import { LineMessageBuilder } from '../common/line_message';
import { Todo } from '../entify/todo.entity';
import { IChatTool, IRemindType, ITodo, ITodoLines, IUser } from '../types';
import { LineBot } from '../config/linebot';

import { AppDataSource } from '../config/data-source';
import { Message, Profile } from '@line/bot-sdk';
import { LineProfile } from '../entify/line_profile.entity';
import { ReportingLine } from '../entify/reporting_lines.entity';
import { User } from '../entify/user.entity';
import { In, Repository } from 'typeorm';
import { ChatMessage } from '../entify/message.entity';
import logger from './../logger/winston';

import {
  MessageTriggerType,
  MessageType,
  RemindType,
  OpenStatus,
  ReplyStatus,
  SenderType,
} from '../const/common';

import moment from 'moment';
import { toJapanDateTime } from '../utils/common';
import { ChatTool } from '../entify/chat_tool.entity';
import CommonRepository from './modules/common.repository';

@Service()
export default class LineRepository {
  private lineProfileRepository: Repository<LineProfile>;
  private userRepositoty: Repository<User>;
  private messageRepository: Repository<ChatMessage>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;

  constructor() {
    this.lineProfileRepository = AppDataSource.getRepository(LineProfile);
    this.userRepositoty = AppDataSource.getRepository(User);
    this.messageRepository = AppDataSource.getRepository(ChatMessage);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.commonRepository = Container.get(CommonRepository);
  }

  pushMessageRemind = async (
    chattool: IChatTool,
    user: IUser,
    todo: ITodo,
    remindDays: number
  ): Promise<any> => {
    try {
      if (!user.line_id) {
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));
        return;
      }

      //1.期日に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_BY_DEADLINE,
        remindDays: remindDays,
      };

      const messageToken = await LineBot.getLinkToken(user.line_id);
      const message = LineMessageBuilder.createRemindMessage(
        messageToken,
        user.name,
        todo,
        remindDays
      );
      const chatMessage = await this.saveChatMessage(
        chattool,
        user,
        message,
        messageToken,
        remindTypes,
        todo
      );

      const messageForSend = LineMessageBuilder.createRemindMessage(
        chatMessage.message_token,
        user.name,
        todo,
        remindDays,
        chatMessage.id
      );

      if (process.env.ENV == 'LOCAL') {
        // console.log(LineMessageBuilder.getTextContentFromMessage(messageForSend));
        console.log(messageForSend);
      } else {
        await LineBot.pushMessage(user.line_id, messageForSend, false);
      }
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

      // const superiorUsers = await this.getSuperiorUsers(user.line_id);

      if (!superiorUser.line_id) {
        logger.error(new LoggerError(superiorUser.name + 'がLineIDが設定されていない。'));
      } else {
        const message = LineMessageBuilder.createStartReportToSuperiorMessage(superiorUser.name);
        await this.pushLineMessage(chattool, superiorUser, message);
      }

      return;
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  /**
   * 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
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
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));

        return;
      }

      //4. 担当者・期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_ASSIGN_DEADLINE,
      };

      const message = LineMessageBuilder.createListTaskMessageToAdmin(user, todos);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushLineMessage(chattool, user, message, remindTypes);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  /**
   * 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
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
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));
        return;
      }

      //2. 担当者・期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_ASSIGN,
      };

      const message = LineMessageBuilder.createNotAssignListTaskMessageToAdmin(user, todos);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushLineMessage(chattool, user, message, remindTypes);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  /**
   * 期日未設定のタスク一覧が1つのメッセージで担当者に送られること
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
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));
        return;
      }

      //3. 期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_DEADLINE,
      };

      const message = LineMessageBuilder.createListTaskMessageToUser(user, todos);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushLineMessage(chattool, user, message, remindTypes);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  /**
   * 期日未設定のタスクがない旨のメッセージが管理者に送られること
   * @param user
   * @param todos
   * @returns
   */
  pushNoListTaskMessageToAdmin = async (chattool: ChatTool, user: IUser): Promise<any> => {
    try {
      if (!user.line_id) {
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));

        return;
      }

      const message = LineMessageBuilder.createNoListTaskMessageToAdmin(user);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushLineMessage(chattool, user, message);
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

  getSuperiorUsers = async (lineId: string): Promise<Array<User>> => {
    // Get user by line id
    const users = await this.commonRepository.getChatToolUserByLineId(lineId);

    if (!users.length) {
      return Promise.resolve([]);
    }

    const userIds: number[] = users.map((user) => user.id).filter(Number);

    // Get supervisords

    const reportingLineRepository = AppDataSource.getRepository(ReportingLine);
    const superiorUserIds = await reportingLineRepository.findBy({
      subordinate_user_id: In(userIds),
    });

    if (superiorUserIds.length == 0) {
      return Promise.resolve([]);
    }

    const superiorUsers = await this.userRepositoty
      .createQueryBuilder('users')
      .where('id IN (:...ids)', {
        ids: superiorUserIds.map((superiorUserId) => superiorUserId.superior_user_id),
      })
      .getMany();

    return superiorUsers;
  };

  getSuperiorOfUsers = async (userIds: number[]): Promise<Array<User>> => {
    if (!userIds.length) return [];

    const reportingLineRepository = AppDataSource.getRepository(ReportingLine);
    const superiorUserIds = await reportingLineRepository
      .createQueryBuilder('reporting_lines')
      .where('subordinate_user_id IN (:...ids)', {
        ids: userIds,
      })
      .getMany();

    if (superiorUserIds.length == 0) {
      return Promise.resolve([]);
    }

    const userIdList = superiorUserIds.map((superiorUserId) => superiorUserId.superior_user_id);

    const superiorUsers = await this.userRepositoty
      .createQueryBuilder('users')
      .where('id IN (:...ids)', {
        ids: userIdList,
      })
      .getMany();

    return superiorUsers;
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
      return await this.messageRepository.findOneBy({
        id: id,
      });
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  pushLineMessage = async (
    chattool: ChatTool,
    user: IUser,
    message: Message,
    remindTypes?: IRemindType
  ): Promise<any> => {
    if (process.env.ENV == 'LOCAL') {
      console.log(LineMessageBuilder.getTextContentFromMessage(message));
    } else {
      await LineBot.pushMessage(user.line_id, message, false);
    }

    const linkToken = await LineBot.getLinkToken(user.line_id);

    return await this.saveChatMessage(chattool, user, message, linkToken, remindTypes);
  };

  replyMessage = async (replyToken: string, message: Message): Promise<any> => {
    if (process.env.ENV == 'LOCAL') {
      console.log(LineMessageBuilder.getTextContentFromMessage(message));
    } else {
      await LineBot.replyMessage(replyToken, message);
    }

    return;
  };

  pushTodoLines = async (dataTodoLines: ITodoLines[]): Promise<void> => {
    for (const todoLine of dataTodoLines) {
      const { todoId, chattool, user, remindDays } = todoLine;

      const todo = await this.todoRepository.findOneBy({
        todoapp_reg_id: todoId,
      });

      if (todo) {
        this.pushMessageRemind(chattool, user, { ...todo, assigned_user_id: user.id }, remindDays);
      }
    }
  };

  saveChatMessage = async (
    chattool: IChatTool,
    user: IUser,
    message: Message,
    messageToken: string,
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
    chatMessage.is_openned = OpenStatus.OPENNED;
    chatMessage.is_replied = ReplyStatus.NOT_REPLIED;
    chatMessage.message_trigger_id = MessageTriggerType.BATCH; // batch
    chatMessage.message_type_id = MessageType.FLEX;

    chatMessage.body = LineMessageBuilder.getTextContentFromMessage(message);
    chatMessage.todo_id = todo?.id;
    chatMessage.send_at = toJapanDateTime(
      moment()
        .utc()
        .toDate()
    );
    chatMessage.user_id = user.id;
    chatMessage.message_token = messageToken;
    chatMessage.remind_type = remindType;
    chatMessage.remind_before_days = remindDays;

    return await this.messageRepository.save(chatMessage);
  };
}
