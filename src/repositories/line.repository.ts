import { LoggerError } from '../exceptions';
import { Service } from 'typedi';
import { LineMessageBuilder } from '../common/line_message';
import { Todo } from '../entify/todo.entity';
import { IUser } from '../types';
import { LineBot } from '../config/linebot';

import { AppDataSource } from '../config/data-source';
import { Message, Profile } from '@line/bot-sdk';
import { LineProfile } from '../entify/line_profile.entity';
import { ReportingLine } from '../entify/reporting_lines.entity';
import { User } from '../entify/user.entity';
import { Repository } from 'typeorm';
import { ChatMessage } from '../entify/message.entity';
import logger from './../logger/winston';
import { IS_OPENED, MessageType, SenderType } from '../const/common';
import moment from 'moment';
import { toJapanDateTime } from '../utils/common';

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

  pushMessageRemind = async (user: IUser, todo: Todo, remindDays: number): Promise<any> => {
    try {
      if (!user.line_id) {
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));

        return;
      }

      const message = LineMessageBuilder.createRemindMessage(user.name, todo, remindDays);
      return await this.pushLineMessage(user.line_id, message, todo);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  pushStartReportToSuperior = async (superiorUser: IUser): Promise<any> => {
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
        await this.pushLineMessage(superiorUser.line_id, message);
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
  pushListTaskMessageToAdmin = async (user: IUser, todos: Array<Todo>): Promise<any> => {
    try {
      if (!user.line_id) {
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));

        return;
      }

      const message = LineMessageBuilder.createListTaskMessageToAdmin(user, todos);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushLineMessage(user.line_id, message);
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
  pushListTaskMessageToUser = async (user: IUser, todos: Array<Todo>): Promise<any> => {
    try {
      if (!user.line_id) {
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));

        return;
      }

      const message = LineMessageBuilder.createListTaskMessageToUser(user, todos);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushLineMessage(user.line_id, message);
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
  pushNoListTaskMessageToAdmin = async (user: IUser): Promise<any> => {
    try {
      if (!user.line_id) {
        logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));

        return;
      }

      const message = LineMessageBuilder.createNoListTaskMessageToAdmin(user);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushLineMessage(user.line_id, message);
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

  pushLineMessage = async (lineId: string, message: Message, todo?: Todo): Promise<any> => {
    if (process.env.ENV == 'LOCAL') {
      console.log(LineMessageBuilder.getTextContentFromMessage(message));
    } else {
      await LineBot.pushMessage(lineId, message, false);
    }

    return await this.saveChatMessage(message, todo);
  };

  replyMessage = async (replyToken: string, message: Message): Promise<any> => {
    if (process.env.ENV == 'LOCAL') {
      console.log(LineMessageBuilder.getTextContentFromMessage(message));
    } else {
      await LineBot.replyMessage(replyToken, message);
    }

    return;
  };

  saveChatMessage = async (message: Message, todo?: Todo): Promise<ChatMessage> => {
    const chatMessage = new ChatMessage();
    chatMessage.is_from_user = SenderType.FROM_BOT;
    chatMessage.chattool_id = 1;
    chatMessage.is_openned = IS_OPENED;
    chatMessage.is_replied = 0;
    chatMessage.message_trigger_id = 1; // batch
    chatMessage.message_type_id = MessageType.FLEX;

    chatMessage.body = LineMessageBuilder.getTextContentFromMessage(message);
    chatMessage.todo_id = todo?.id;
    chatMessage.send_at = toJapanDateTime(
      moment()
        .utc()
        .toDate()
    );
    chatMessage.user_id = todo?.assigned_user_id;

    return await this.messageRepository.save(chatMessage);
  };
}
