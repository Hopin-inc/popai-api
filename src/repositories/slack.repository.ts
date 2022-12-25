// noinspection DuplicatedCode

import { LoggerError } from '../exceptions';
import { Container, Service } from 'typedi';
import { SlackMessageBuilder } from '../common/slack_message';
import { Todo } from '../entify/todo.entity';
import { IChatTool, IChatToolUser, ICompany, IRemindType, ITodo, ITodoSlacks, IUser } from '../types';
import { SlackBot } from '../config/slackbot';

import { AppDataSource } from '../config/data-source';
import { ReportingLine } from '../entify/reporting_lines.entity';
import { User } from '../entify/user.entity';
import { In, IsNull, Not, Repository } from 'typeorm';
import { ChatMessage } from '../entify/message.entity';
import logger from './../logger/winston';

import {
  ChatToolCode,
  Common,
  MessageTriggerType,
  MessageType,
  OpenStatus,
  RemindType,
  ReplyStatus,
  SenderType,
} from '../const/common';

import moment from 'moment';
import { diffDays, toJapanDateTime } from '../utils/common';
import { ChatTool } from '../entify/chat_tool.entity';
import CommonRepository from './modules/common.repository';
import { SlackProfile } from '../entify/slack.profile';
import { MessageAttachment } from '@slack/web-api';
import { ChatToolUser } from '../entify/chattool.user.entity';
import { Section } from '../entify/section.entity';

@Service()
export default class SlackRepository {
  private SlackProfileRepository: Repository<SlackProfile>;
  private userRepository: Repository<User>;
  private messageRepository: Repository<ChatMessage>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;
  private sectionRepository: Repository<Section>;
  private chattoolRepository: Repository<ChatTool>;


  constructor() {
    this.SlackProfileRepository = AppDataSource.getRepository(SlackProfile);
    this.userRepository = AppDataSource.getRepository(User);
    this.messageRepository = AppDataSource.getRepository(ChatMessage);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.commonRepository = Container.get(CommonRepository);
    this.sectionRepository = AppDataSource.getRepository(Section);
    this.chattoolRepository = AppDataSource.getRepository(ChatTool);
  }

  pushMessageRemind = async (
    chatTool: IChatTool,
    user: IUser,
    todo: ITodo,
    remindDays: number,
    channelId: string,
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

      if (process.env.ENV == 'LOCAL') {
        console.log(message);
      } else {
        const response = await SlackBot.chat.postMessage({
          channel: channelId,
          text: 'お知らせ',
          blocks: message.blocks,
        });
        if (response.ok === true) {
          return await this.saveChatMessage(
            chatTool,
            message,
            MessageTriggerType.BATCH,
            channelId,
            response.ts,
            user,
            remindTypes,
            todo,
          );
        }
      }
    } catch (error) {
      console.log('user', user);
      console.log('todo', todo);
      logger.error(new LoggerError(error.message));
    }
  };

  pushMessageStartRemindToUser = async (todoSlacks: ITodoSlacks[], channelId: string): Promise<any> => {
    try {
      const user = todoSlacks[0].user;
      const chatTool = todoSlacks[0].chatTool;

      if (!user.slack_id) {
        logger.error(new LoggerError(user.name + 'がSlackIDが設定されていない。'));
        return;
      }

      //1.期日に対するリマインド
      const message: MessageAttachment = SlackMessageBuilder.createStartRemindMessageToUser(user, todoSlacks);

      if (process.env.ENV == 'LOCAL') {
        // console.log(SlackMessageBuilder.getTextContentFromMessage(messageForSend));
        console.log(message);
      } else {
        await this.pushSlackMessage(chatTool, user, message, MessageTriggerType.ACTION, channelId);
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
   * @param channelId
   * @returns
   */
  pushListTaskMessageToAdmin = async (
    chatTool: ChatTool,
    user: IUser,
    todos: ITodo[],
    channelId: string,
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
        channelId,
        null,
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
   * @param channelId
   * @returns
   */
  pushNotAssignListTaskMessageToAdmin = async (
    chatTool: ChatTool,
    user: IUser,
    todos: ITodo[],
    channelId: string,
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
        channelId,
        null,
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
   * @param channelId
   * @returns
   */
  pushListTaskMessageToUser = async (
    chatTool: ChatTool,
    user: IUser,
    todos: ITodo[],
    channelId: string,
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
        channelId,
        null,
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
   * @param channelId
   * @returns
   */
  pushNoListTaskMessageToAdmin = async (chatTool: ChatTool, user: IUser, channelId: string): Promise<any> => {
    try {
      if (!user.slack_id) {
        logger.error(new LoggerError(user.name + 'がSlackIDが設定されていない。'));

        return;
      }

      const message = SlackMessageBuilder.createNoListTaskMessageToAdmin(user);
      // await this.saveChatMessage(user, todo, message);
      return await this.pushSlackMessage(chatTool, user, message, MessageTriggerType.BATCH, channelId);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  getSuperiorUsers = async (slackId: string): Promise<Array<User>> => {
    const users = await this.commonRepository.getChatToolUserByUserId(slackId);

    if (!users.length) {
      return Promise.resolve([]);
    }

    const userIds: number[] = users.map((user) => user.id).filter(Number);

    const reportingLineRepository = AppDataSource.getRepository(ReportingLine);
    const superiorUserIds = await reportingLineRepository.findBy({
      subordinate_user_id: In(userIds),
    });

    if (superiorUserIds.length == 0) {
      return Promise.resolve([]);
    }

    return await this.userRepository
      .createQueryBuilder('users')
      .where('id IN (:...ids)', {
        ids: superiorUserIds.map((superiorUserId) => superiorUserId.superior_user_id),
      })
      .getMany();
  };

  getSlackTodo = async (channelId: string, threadId: string): Promise<Todo> => {
    const message = await this.messageRepository.findOneBy({
      channel_id: channelId,
      thread_id: threadId,
      todo_id: Not(IsNull()),
    });

    return await this.todoRepository.findOne({
      where: {
        id: message.todo_id,
      }, relations: ['todoapp'],
    });
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
    channelId: string,
    threadId?: string,
    remindTypes?: IRemindType,
  ): Promise<any> => {
    if (process.env.ENV == 'LOCAL') {
      console.log(SlackMessageBuilder.getTextContentFromMessage(message));
    } else {
      const response = await SlackBot.chat.postMessage({
        channel: channelId,
        thread_ts: threadId,
        text: 'お知らせ',
        blocks: message.blocks,
      });
      if (response.ok === true) {
        return await this.saveChatMessage(
          chatTool,
          message,
          messageTriggerId,
          channelId,
          threadId,
          user,
        );
      }
    }
  };

  replyMessage = async (
    chatTool: ChatTool,
    message: MessageAttachment,
    channelId: string,
    threadId: string,
    user?: User,
  ): Promise<any> => {
    if (process.env.ENV == 'LOCAL') {
      console.log(SlackMessageBuilder.getTextContentFromMessage(message));
    } else {
      const response = await SlackBot.chat.postMessage({
        channel: channelId,
        thread_ts: threadId,
        text: 'お知らせ',
        blocks: message.blocks,
      });
      if (response.ok === true) {
        return await this.saveChatMessage(
          chatTool,
          message,
          MessageTriggerType.ACTION,
          channelId,
          threadId,
          user,
        );
      }
    }
  };

  getUserFromSlackId = async (slackId: string): Promise<User> => {
    const users = await this.commonRepository.getChatToolUserByUserId(slackId);

    if (!users.length) {
      return Promise.resolve(null);
    }

    return users[0];
  };

  pushTodoSlack = async (todoSlack: ITodoSlacks, channelId: string): Promise<ChatMessage> => {
    const { todo, chatTool, user, remindDays } = todoSlack;
    return await this.pushMessageRemind(
      chatTool,
      user,
      { ...todo, assigned_user_id: user.id },
      remindDays,
      channelId,
    );
  };

  saveChatMessage = async (
    chatTool: IChatTool,
    message: MessageAttachment,
    messageTriggerId: number,
    channelId: string,
    threadId: string,
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
    chatMessage.chatTool_id = chatTool.id;
    chatMessage.is_openned = OpenStatus.OPENNED;
    chatMessage.is_replied = ReplyStatus.NOT_REPLIED;
    chatMessage.message_trigger_id = messageTriggerId; // batch
    chatMessage.message_type_id = MessageType.TEXT;
    chatMessage.channel_id = channelId;
    chatMessage.thread_id = threadId;

    chatMessage.body = SlackMessageBuilder.getTextContentFromMessage(message);
    chatMessage.todo_id = todo?.id;
    chatMessage.send_at = toJapanDateTime(
      moment()
        .utc()
        .toDate(),
    );
    chatMessage.user_id = user?.id;
    chatMessage.remind_type = remindType;
    chatMessage.remind_before_days = remindDays;

    return await this.messageRepository.save(chatMessage);
  };

  getSendChannel = async (company: ICompany): Promise<string> => {
    const companyId = company.id;
    const section = await this.sectionRepository
      .createQueryBuilder('sections')
      .where('sections.company_id = :companyId', { companyId })
      .andWhere('sections.channel_id IS NOT NULL')
      .getOne();

    return section.channel_id;
  };

  remindTaskForAdminCompany = async (company: ICompany): Promise<void> => {
    if (!company.admin_user) {
      logger.error(new LoggerError(company.name + 'の管理者が設定していません。'));
    }
    const channelId = await this.getSendChannel(company);

    if (channelId) {
      const chattoolUsers = await this.commonRepository.getChatToolUsers();
      const needRemindTasks = await this.commonRepository.getNotsetDueDateOrNotAssignTasks(
        company.id,
      );

      // 期日未設定のタスクがない旨のメッセージが管理者に送られること
      if (needRemindTasks.length) {
        // 期日未設定のタスクがある場合

        const notSetDueDateAndNotAssign = needRemindTasks.filter(
          (task) => !task.deadline && !task.todoUsers.length,
        );

        if (notSetDueDateAndNotAssign.length) {
          const remindTasks = notSetDueDateAndNotAssign.filter(
            (tasks) => tasks.reminded_count < Common.remindMaxCount,
          );

          // 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
          // Send to admin list task which not set duedate
          if (remindTasks.length) {
            for (const chattool of company.chattools) {
              if (chattool.tool_code == ChatToolCode.SLACK && company.admin_user) {
                const adminUser = company.admin_user;
                const chatToolUser = chattoolUsers.find(
                  (chattoolUser) =>
                    chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == adminUser.id,
                );

                if (chatToolUser) {
                  await this.pushListTaskMessageToAdmin(
                    chattool,
                    { ...adminUser, line_id: chatToolUser.auth_key },
                    remindTasks,
                    channelId,
                  );
                }
              }
            }

            // await this.updateRemindedCount(remindTasks);
          }
        } else {
          for (const chattool of company.chattools) {
            if (chattool.tool_code == ChatToolCode.SLACK && company.admin_user) {
              const adminUser = company.admin_user;
              const chatToolUser = chattoolUsers.find(
                (chattoolUser) =>
                  chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == adminUser.id,
              );

              if (chatToolUser) {
                await this.pushNoListTaskMessageToAdmin(
                  chattool,
                  { ...adminUser, line_id: chatToolUser.auth_key },
                  channelId);
              }
            }
          }
        }

        // ・期日未設定のタスク一覧が1つのメッセージで担当者に送られること
        const notSetDueDateTasks = needRemindTasks.filter(
          (task) =>
            !task.deadline && task.todoUsers.length && task.reminded_count < Common.remindMaxCount,
        );

        // Send list task to each user
        if (notSetDueDateTasks.length) {
          const userTodoMap = this.mapUserTaskList(notSetDueDateTasks);

          userTodoMap.forEach((todos: ITodo[], userId: number) => {
            company.chattools.forEach(async (chattool) => {
              if (chattool.tool_code == ChatToolCode.SLACK) {
                const user = todos[0].user;

                const chatToolUser = chattoolUsers.find(
                  (chattoolUser) =>
                    chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == user.id,
                );

                if (chatToolUser) {
                  await this.pushListTaskMessageToUser(
                    chattool,
                    { ...user, slack_id: chatToolUser.auth_key },
                    todos,
                    channelId,
                  );
                }
              }
            });

            // await this.updateRemindedCount(todos);
          });
        }

        // 担当者未設定・期日設定済みの場合
        const notSetAssignTasks = needRemindTasks.filter(
          (task) =>
            task.deadline && !task.todoUsers.length && task.reminded_count < Common.remindMaxCount,
        );

        if (notSetAssignTasks.length) {
          for (const chattool of company.chattools) {
            if (chattool.tool_code == ChatToolCode.SLACK && company.admin_user) {
              const adminUser = company.admin_user;
              const chatToolUser = chattoolUsers.find(
                (chattoolUser) =>
                  chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == adminUser.id,
              );

              if (chatToolUser) {
                await this.pushNotAssignListTaskMessageToAdmin(
                  chattool,
                  { ...adminUser, slack_id: chatToolUser.auth_key },
                  notSetAssignTasks,
                  channelId,
                );
              }
            }
          }

          // await this.updateRemindedCount(notSetAssignTasks);
        }
      }
    } else {
      console.log('NOT channelId');
    }
  };

  mapUserTaskList = (todos: ITodo[]): Map<number, ITodo[]> => {
    const map = new Map<number, ITodo[]>();

    todos.forEach((todo) => {
      for (const todoUser of todo.todoUsers) {
        if (map.has(todoUser.user.id)) {
          map.get(todoUser.user.id).push({ ...todo, user: todoUser.user });
        } else {
          map.set(todoUser.user.id, [{ ...todo, user: todoUser.user }]);
        }
      }
    });

    return map;
  };

  mapUserRemindTaskList = (
    remindTasks: ITodo[],
    chatTool: IChatTool,
    chatToolUsers: IChatToolUser[],
  ): Map<number, ITodoSlacks[]> => {
    const map = new Map<number, ITodoSlacks[]>();

    for (const remindTask of remindTasks) {
      const remindDays = diffDays(remindTask.deadline, toJapanDateTime(new Date()));
      for (const todoUser of remindTask.todoUsers) {
        const chatToolUser = chatToolUsers.find(
          (chatToolUser) =>
            chatTool &&
            chatToolUser.chattool_id == chatTool.id &&
            chatToolUser.user_id == todoUser.user_id,
        );

        if (chatToolUser) {
          if (map.has(todoUser.user_id)) {
            map.get(todoUser.user_id).push({
              todo: remindTask,
              user: { ...todoUser.user, slack_id: chatToolUser.auth_key },
              chatTool: chatTool,
              remindDays: remindDays,
            });
          } else {
            map.set(todoUser.user_id, [
              {
                todo: remindTask,
                user: { ...todoUser.user, slack_id: chatToolUser.auth_key },
                chatTool: chatTool,
                remindDays: remindDays,
              },
            ]);
          }
        }
      }
    }

    return map;
  };

  remindTodayTaskForUser = async (company: ICompany, user: User = null): Promise<void> => {
    const channelId = await this.getSendChannel(company);

    const remindedTodos: ITodo[] = [];
    const chatToolUsers = await this.commonRepository.getChatToolUsers();
    const remindTasks: ITodo[] = await this.getTodayRemindTasks(company, chatToolUsers);
    const chatTool = await this.chattoolRepository.findOneBy({
      tool_code: ChatToolCode.SLACK,
    });
    const userTodoMap = this.mapUserRemindTaskList(remindTasks, chatTool, chatToolUsers);

    for await (const [userId, todoSlacks] of userTodoMap) {
      await this.pushMessageStartRemindToUser(todoSlacks, channelId);

      for (const todoSlack of todoSlacks) {
        await this.pushTodoSlack(todoSlack, channelId);
        remindedTodos.push(todoSlack.todo);
      }
    }

    await this.updateRemindedCount(remindTasks);
  };

  updateRemindedCount = async (todos: ITodo[]): Promise<any> => {
    const todoDatas = todos.map((todo) => {
      return {
        ...todo,
        reminded_count: todo.reminded_count + 1,
      };
    });
    return await this.todoRepository.upsert(todoDatas, []);
  };

  getTodayRemindTasks = async (
    company: ICompany,
    chatToolUsers: ChatToolUser[],
  ): Promise<Array<Todo>> => {
    const dayReminds: number[] = await this.commonRepository.getDayReminds(
      company.companyConditions,
    );
    const today = toJapanDateTime(new Date());

    const todayRemindTasks: Todo[] = [];

    const todos: Todo[] = await this.getRemindTodoTask(company);
    todos.forEach((todo) => {
      const dayDurations = diffDays(todo.deadline, today);

      if (dayReminds.includes(dayDurations)) {
        for (const todoUser of todo.todoUsers) {
          company.chattools.forEach(async (chattool) => {
            if (chattool.tool_code == ChatToolCode.SLACK) {
              const chatToolUser = chatToolUsers.find(
                (chattoolUser) =>
                  chattoolUser.chattool_id == chattool.id &&
                  chattoolUser.user_id == todoUser.user_id,
              );
              if (chatToolUser) {
                todayRemindTasks.push(todo);
              }
            }
          });
        }
      }
    });
    return todayRemindTasks;
  };

  getRemindTodoTask = async (company: ICompany, user?: User): Promise<Todo[]> => {
    const today = toJapanDateTime(new Date());
    const dayReminds: number[] = await this.commonRepository.getDayReminds(
      company.companyConditions,
    );

    const minValue = dayReminds.reduce(function(prev, curr) {
      return prev < curr ? prev : curr;
    });
    const maxValue = dayReminds.reduce(function(prev, curr) {
      return prev > curr ? prev : curr;
    });

    const minDate = moment(today)
      .add(-maxValue, 'days')
      .startOf('day')
      .toDate();

    const maxDate = moment(today)
      .add(-minValue + 1, 'days')
      .startOf('day')
      .toDate();

    const query = this.todoRepository
      .createQueryBuilder('todos')
      .leftJoinAndSelect('todos.todoUsers', 'todo_users')
      .leftJoinAndSelect('todo_users.user', 'users')
      .where('todos.is_done = :done', { done: false })
      .andWhere('todos.is_closed = :closed', { closed: false })
      .andWhere('todos.company_id = :company_id', { company_id: company.id })
      .andWhere('todos.reminded_count < :reminded_count', { reminded_count: Common.remindMaxCount })
      .andWhere('todos.deadline >= :min_date', { min_date: minDate })
      .andWhere('todos.deadline <= :max_date', { max_date: maxDate })
      .andWhere('todo_users.deleted_at IS NULL');

    if (user) {
      query.andWhere('todo_users.user_id = :user_id', { user_id: user.id });
    }

    return await query.getMany();
  };
}
