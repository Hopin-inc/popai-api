// noinspection DuplicatedCode

import { LoggerError } from '../exceptions';
import { Service, Container } from 'typedi';
import { SlackMessageBuilder } from '../common/slack_message';
import { Todo } from '../entify/todo.entity';
import { IChatTool, IRemindType, ITodo, ITodoSlacks, IUser } from '../types';
import { SlackBot } from '../config/slackbot';

import { AppDataSource } from '../config/data-source';
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
import { IncomingWebhook } from '@slack/web-api/dist/response/OauthAccessResponse';
import { SlackProfile } from '../entify/slack.profile';
import { MessageAttachment } from '@slack/web-api';

@Service()
export default class SlackRepository {
  private SlackProfileRepository: Repository<SlackProfile>;
  private userRepository: Repository<User>;
  private messageRepository: Repository<ChatMessage>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;

  constructor() {
    this.SlackProfileRepository = AppDataSource.getRepository(SlackProfile);
    this.userRepository = AppDataSource.getRepository(User);
    this.messageRepository = AppDataSource.getRepository(ChatMessage);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.commonRepository = Container.get(CommonRepository);
  }

  pushMessageRemind = async (
    chatTool: IChatTool,
    user: IUser,
    todo: ITodo,
    remindDays: number,
    event: IncomingWebhook,
  ): Promise<ChatMessage> => {
    try {
      if (!user.slack_id) {
        logger.error(new LoggerError(user.name + 'がSlackIDが設定されていない。'));
        return;
      }

      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_BY_DEADLINE,
        remindDays: remindDays,
      };

      const message = SlackMessageBuilder.createRemindMessage(
        user.name,
        todo,
        remindDays,
      );

      const chatMessage = await this.saveChatMessage(
        chatTool,
        message,
        MessageTriggerType.BATCH,
        event.configuration_url,
        user,
        remindTypes,
        todo,
      );

      if (process.env.ENV == 'LOCAL') {
        console.log(message);
      } else {
        await SlackBot.postMessage(event.channel_id, message);
      }

      return chatMessage;
    } catch (error) {
      console.log('user', user);
      console.log('todo', todo);
      logger.error(new LoggerError(error.message));
    }
  };

  pushMessageStartRemindToUser = async (todoLines: ITodoSlacks[]): Promise<any> => {
    try {
      const user = todoLines[0].user;
      const chatTool = todoLines[0].chatTool;

      if (!user.slack_id) {
        logger.error(new LoggerError(user.name + 'がSlackIDが設定されていない。'));
        return;
      }

      //1.期日に対するリマインド
      const message:MessageAttachment = SlackMessageBuilder.createStartRemindMessageToUser(user, todoLines);

      if (process.env.ENV == 'LOCAL') {
        // console.log(SlackMessageBuilder.getTextContentFromMessage(messageForSend));
        console.log(message);
      } else {
        await this.pushSlackMessage(chatTool, user, message, MessageTriggerType.ACTION);
      }

      return;
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  pushStartReportToSuperior = async (chatTool: ChatTool, superiorUser: IUser): Promise<any> => {
    try {
      // if (!user.slack_id) {
      //   logger.error(new LoggerError(user.name + 'がSlackIDが設定されていない。'));
      //   return;
      // }

      // const superiorUsers = await this.getSuperiorUsers(user.slack_id);

      if (!superiorUser.slack_id) {
        logger.error(new LoggerError(superiorUser.name + 'がSlackIDが設定されていない。'));
      } else {
        const message = SlackMessageBuilder.createStartReportToSuperiorMessage(superiorUser.name);
        await this.pushSlackMessage(chatTool, superiorUser, message, MessageTriggerType.ACTION);
      }

      return;
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  /**
   * 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
   * @param chatTool
   * @param user
   * @param todos
   * @returns
   */
  pushListTaskMessageToAdmin = async (
    chatTool: ChatTool,
    user: IUser,
    todos: ITodo[],
  ): Promise<any> => {
    try {
      if (!user.slack_id) {
        logger.error(new LoggerError(user.name + 'がSlackIDが設定されていない。'));

        return;
      }

      //4. 担当者・期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_ASSIGN_DEADLINE,
      };

      const message = SlackMessageBuilder.createListTaskMessageToAdmin(user, todos);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushSlackMessage(
        chatTool,
        user,
        message,
        MessageTriggerType.BATCH,
        remindTypes,
      );
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  /**
   * 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
   * @param chatTool
   * @param user
   * @param todos
   * @returns
   */
  pushNotAssignListTaskMessageToAdmin = async (
    chatTool: ChatTool,
    user: IUser,
    todos: ITodo[],
  ): Promise<any> => {
    try {
      if (!user.slack_id) {
        logger.error(new LoggerError(user.name + 'がSlackIDが設定されていない。'));
        return;
      }

      //2. 担当者・期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_ASSIGN,
      };

      const message = SlackMessageBuilder.createNotAssignListTaskMessageToAdmin(user, todos);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushSlackMessage(
        chatTool,
        user,
        message,
        MessageTriggerType.BATCH,
        remindTypes,
      );
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  /**
   * 期日未設定のタスク一覧が1つのメッセージで担当者に送られること
   * @param chatTool
   * @param user
   * @param todos
   * @returns
   */
  pushListTaskMessageToUser = async (
    chatTool: ChatTool,
    user: IUser,
    todos: ITodo[],
  ): Promise<any> => {
    try {
      if (!user.slack_id) {
        logger.error(new LoggerError(user.name + 'がSlackIDが設定されていない。'));
        return;
      }

      //3. 期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_DEADLINE,
      };

      const message = SlackMessageBuilder.createListTaskMessageToUser(user, todos);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushSlackMessage(
        chatTool,
        user,
        message,
        MessageTriggerType.BATCH,
        remindTypes,
      );
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  /**
   * 期日未設定のタスクがない旨のメッセージが管理者に送られること
   * @param chatTool
   * @param user
   * @returns
   */
  pushNoListTaskMessageToAdmin = async (chatTool: ChatTool, user: IUser): Promise<any> => {
    try {
      if (!user.slack_id) {
        logger.error(new LoggerError(user.name + 'がSlackIDが設定されていない。'));

        return;
      }

      const message = SlackMessageBuilder.createNoListTaskMessageToAdmin(user);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushSlackMessage(chatTool, user, message, MessageTriggerType.BATCH);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  createSlackProfile = async (slackProfile): Promise<SlackProfile> => {
    try {
      const findResult = await this.SlackProfileRepository.findOneBy({
        slack_id: slackProfile.id,
      })

      if (!findResult) {
        const profile = new SlackProfile();
        profile.slack_id = slackProfile.id;
        profile.display_name = slackProfile.real_name;
        profile.picture_url = slackProfile.profile.image_96;

        return await this.SlackProfileRepository.save(profile);
      }

      return findResult;
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  //TODO:chatToolIdを挿入すればdatabaseから抽出するcodeは応用可能だと思われる
  //TODO:"LineHogeHoge"のmethodNameを変える必要性あり
  getUserFromSlackId = async (slackId: string): Promise<User> => {
    // Get user by line id
    const users = await this.commonRepository.getChatToolUserByLineId(slackId);

    if (!users.length) {
      return Promise.resolve(null);
    }

    return users[0];
  };

  getSuperiorUsers = async (slackId: string): Promise<Array<User>> => {
    // Get user by line id
    const users = await this.commonRepository.getChatToolUserByLineId(slackId);

    if (!users.length) {
      return Promise.resolve([]);
    }

    const userIds: number[] = users.map((user) => user.id).filter(Number);

    // Get supervisors

    const reportingLineRepository = AppDataSource.getRepository(ReportingLine);
    const superiorUserIds = await reportingLineRepository.findBy({
      subordinate_user_id: In(userIds),
    });

    if (superiorUserIds.length == 0) {
      return Promise.resolve([]);
    }

    const superiorUsers = await this.userRepository
      .createQueryBuilder('users')
      .where('id IN (:...ids)', {
        ids: superiorUserIds.map((superiorUserId) => superiorUserId.superior_user_id),
      })
      .getMany();

    return superiorUsers;
  };

  getSuperiorOfUsers = async (userIds: number[]): Promise<Array<User>> => {
    if (!userIds.length) return [];

    const reportingSlackRepository = AppDataSource.getRepository(ReportingLine);
    const superiorUserIds = await reportingSlackRepository
      .createQueryBuilder('reporting_lines')
      .where('subordinate_user_id IN (:...ids)', {
        ids: userIds,
      })
      .getMany();

    if (superiorUserIds.length == 0) {
      return Promise.resolve([]);
    }

    const userIdList = superiorUserIds.map((superiorUserId) => superiorUserId.superior_user_id);

    const superiorUsers = await this.userRepository
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

  pushSlackMessage = async (
    chatTool: IChatTool,
    user: IUser,
    message: MessageAttachment,
    messageTriggerId: number,
    remindTypes?: IRemindType,
    event?: IncomingWebhook
  ): Promise<any> => {
    if (process.env.ENV == 'LOCAL') {
      console.log(SlackMessageBuilder.getTextContentFromMessage(message));
    } else {
      await SlackBot.postMessage(event.channel_id, message);
    }

    const linkToken = event.configuration_url;

    return await this.saveChatMessage(
      chatTool,
      message,
      messageTriggerId,
      linkToken,
      user,
      remindTypes,
    );
  };

  replyMessage = async (
    chatTool: ChatTool,
    replyToken: string,
    message: MessageAttachment,
    user?: User,
  ): Promise<any> => {
    if (process.env.ENV == 'LOCAL') {
      console.log(SlackMessageBuilder.getTextContentFromMessage(message));
    } else {
      await SlackBot.replyMessage(replyToken, message);
    }

    return await this.saveChatMessage(
      chatTool,
      message,
      MessageTriggerType.ACTION,
      replyToken,
      user,
    );
  };

  pushTodoSlack = async (todoLine: ITodoSlacks): Promise<ChatMessage> => {
    const { todo, chatTool, user, remindDays } = todoLine;
    return await this.pushMessageRemind(
      chatTool,
      user,
      { ...todo, assigned_user_id: user.id },
      remindDays
    );
  };

  saveChatMessage = async (
    chatTool: IChatTool,
    message: MessageAttachment,
    messageTriggerId: number,
    messageToken: string,
    user?: IUser,
    remindTypes?: IRemindType,
    todo?: ITodo,
  ): Promise<ChatMessage> => {
    const { remindType, remindDays } = {
      remindType: RemindType.NOT_REMIND,
      remindDays: null,
      ...remindTypes,
    };

    const chatMessage = new ChatMessage();
    chatMessage.is_from_user = SenderType.FROM_BOT;
    chatMessage.chattool_id = chatTool.id;
    chatMessage.is_openned = OpenStatus.OPENNED;
    chatMessage.is_replied = ReplyStatus.NOT_REPLIED;
    chatMessage.message_trigger_id = messageTriggerId; // batch
    chatMessage.message_type_id = MessageType.FLEX;

    chatMessage.body = SlackMessageBuilder.getTextContentFromMessage(message);
    chatMessage.todo_id = todo?.id;
    chatMessage.send_at = toJapanDateTime(
      moment()
        .utc()
        .toDate(),
    );
    chatMessage.user_id = user?.id;
    chatMessage.message_token = messageToken;
    chatMessage.remind_type = remindType;
    chatMessage.remind_before_days = remindDays;

    return await this.messageRepository.save(chatMessage);
  };
}
