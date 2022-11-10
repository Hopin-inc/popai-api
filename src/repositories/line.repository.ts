import { LoggerError } from '../exceptions';
import { Service } from 'typedi';
import { LineMessageBuilder } from '../common/line_message';
import { Todo } from '../entify/todo.entity';
import { IChatTool, IRemindType, IUser } from '../types';
import { LineBot } from '../config/linebot';

import { AppDataSource } from '../config/data-source';
import { Message, Profile } from '@line/bot-sdk';
import { LineProfile } from '../entify/line_profile.entity';
import { ReportingLine } from '../entify/reporting_lines.entity';
import { User } from '../entify/user.entity';
import { Repository } from 'typeorm';
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

@Service()
export default class LineRepository {
  private lineProfileRepository: Repository<LineProfile>;
  private userRepositoty: Repository<User>;
  private messageRepository: Repository<ChatMessage>;

  constructor() {
    this.lineProfileRepository = AppDataSource.getRepository(LineProfile);
    this.userRepositoty = AppDataSource.getRepository(User);
    this.messageRepository = AppDataSource.getRepository(ChatMessage);
  }

  pushMessageRemind = async (
    chattool: IChatTool,
    user: IUser,
    todo: Todo,
    remindDays: number,
    dayReminds: number[]
  ): Promise<any> => {
    try {
      if (!user.line_id) {
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));
        return;
      }

      //1.期日に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_BY_DEADLINE,
        dayReminds: dayReminds,
      };

      const message = LineMessageBuilder.createRemindMessage(user.name, todo, remindDays);
      const chatMessage = await this.saveChatMessage(chattool, user, message, remindTypes, todo);

      const messageForSend = LineMessageBuilder.createRemindMessage(
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
    todos: Array<Todo>,
    dayReminds: number[]
  ): Promise<any> => {
    try {
      if (!user.line_id) {
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));

        return;
      }

      //4. 担当者・期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_ASSIGN_DEADLINE,
        dayReminds: dayReminds,
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
    todos: Array<Todo>,
    dayReminds: number[]
  ): Promise<any> => {
    try {
      if (!user.line_id) {
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));
        return;
      }

      //2. 担当者・期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_ASSIGN,
        dayReminds: dayReminds,
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
    todos: Array<Todo>,
    dayReminds: number[]
  ): Promise<any> => {
    try {
      if (!user.line_id) {
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));
        return;
      }

      //3. 期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_DEADLINE,
        dayReminds: dayReminds,
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
    // Get userinfo
    const userInfo = await this.userRepositoty.findOneBy({ line_id: lineId });

    if (!userInfo) {
      return Promise.resolve([]);
    }

    // Get supervisords

    const reportingLineRepository = AppDataSource.getRepository(ReportingLine);
    const superiorUserIds = await reportingLineRepository.findBy({
      subordinate_user_id: userInfo.id,
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

    return await this.saveChatMessage(chattool, user, message, remindTypes);
  };

  replyMessage = async (replyToken: string, message: Message): Promise<any> => {
    if (process.env.ENV == 'LOCAL') {
      console.log(LineMessageBuilder.getTextContentFromMessage(message));
    } else {
      await LineBot.replyMessage(replyToken, message);
    }

    return;
  };

  saveChatMessage = async (
    chattool: IChatTool,
    user: IUser,
    message: Message,
    remindTypes?: IRemindType,
    todo?: Todo
  ): Promise<ChatMessage> => {
    const linkToken = await LineBot.getLinkToken(user.line_id);

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
    chatMessage.message_token = linkToken;

    if (remindTypes) {
      const { remindType, dayReminds } = remindTypes;
      chatMessage.remind_type = remindType;
      chatMessage.remind_before_days = dayReminds ? dayReminds.join(',') : null;
    }

    return await this.messageRepository.save(chatMessage);
  };
}
