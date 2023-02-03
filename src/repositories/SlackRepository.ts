import { Container, Service } from "typedi";
import { In, IsNull, Not, Repository } from "typeorm";
import { MessageAttachment } from "@slack/web-api";
import moment from "moment";

import SlackMessageBuilder from "@/common/SlackMessageBuilder";
import Todo from "@/entities/Todo";

import ChatTool from "@/entities/ChatTool";
import ChatToolUser from "@/entities/ChatToolUser";
import Company from "@/entities/Company";
import ChatMessage from "@/entities/ChatMessage";
import ReportingLine from "@/entities/ReportingLine";
import Section from "@/entities/Section";
import User from "@/entities/User";

import CommonRepository from "./modules/CommonRepository";
import logger from "@/logger/winston";
import {
  ChatToolCode,
  MAX_REMIND_COUNT,
  MessageTriggerType,
  MessageType,
  OpenStatus,
  RemindType,
  ReplyStatus,
  SenderType,
} from "@/consts/common";
import { diffDays, toJapanDateTime } from "@/utils/common";
import SlackBot from "@/config/slack-bot";
import AppDataSource from "@/config/data-source";
import { LoggerError } from "@/exceptions";
import { IRemindType } from "@/types";
import { ITodoSlack } from "@/types/slack";

@Service()
export default class SlackRepository {
  private userRepository: Repository<User>;
  private messageRepository: Repository<ChatMessage>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;
  private sectionRepository: Repository<Section>;
  private chattoolRepository: Repository<ChatTool>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.messageRepository = AppDataSource.getRepository(ChatMessage);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.commonRepository = Container.get(CommonRepository);
    this.sectionRepository = AppDataSource.getRepository(Section);
    this.chattoolRepository = AppDataSource.getRepository(ChatTool);
  }

  public async pushMessageRemind(
    chatTool: ChatTool,
    user: User,
    todo: Todo,
    remindDays: number,
    _channelId: string,
  ): Promise<ChatMessage> {
    try {
      if (!user.slackId) {
        logger.error(new LoggerError(user.name + "がSlackIDが設定されていない。"));
        return;
      }

      const remindTypes: IRemindType = { remindType: RemindType.REMIND_BY_DEADLINE, remindDays };

      const message = SlackMessageBuilder.createRemindMessage(user, todo, remindDays);

      if (process.env.ENV === "LOCAL") {
        console.log(message);
      } else {
        const getDmId = await SlackBot.conversations.open({ users: user.slackId });
        const dmId = getDmId.channel.id;

        const response = await SlackBot.chat.postMessage({
          channel: dmId,
          text: "お知らせ",
          blocks: message.blocks,
        });
        if (response.ok) {
          return await this.saveChatMessage(
            chatTool,
            message,
            MessageTriggerType.REMIND,
            dmId,
            response.ts,
            user,
            remindTypes,
            todo,
          );
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  private async pushMessageStartRemindToUser(todoSlacks: ITodoSlack[]): Promise<any> {
    try {
      const user = todoSlacks[0].user;
      const chatTool = todoSlacks[0].chatTool;

      if (!user.slackId) {
        logger.error(new LoggerError(user.name + "がSlackIDが設定されていない。"));
        return;
      }

      //1.期日に対するリマインド
      const message: MessageAttachment = SlackMessageBuilder.createBeforeRemindMessage(user, todoSlacks);

      const getDmId = await SlackBot.conversations.open({ users: user.slackId });
      const dmId = getDmId.channel.id;

      if (process.env.ENV === "LOCAL") {
        // console.log(SlackMessageBuilder.getTextContentFromMessage(messageForSend));
        console.log(message);
      } else {
        await this.pushSlackMessage(chatTool, user, message, MessageTriggerType.REMIND, dmId);
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
   * @param channelId
   * @returns
   */
  public async pushListTaskMessageToAdmin(
    chatTool: ChatTool,
    user: User,
    todos: Todo[],
    channelId: string,
  ): Promise<any> {
    try {
      if (!user.slackId) {
        logger.error(new LoggerError(user.name + "がSlackIDが設定されていない。"));
        return;
      }

      //4. 担当者・期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_ASSIGN_DEADLINE,
      };

      const isNotDoneTodos = todos.filter(todo => todo.is_done !== true);
      const message = SlackMessageBuilder.createNotifyUnsetMessage(user, isNotDoneTodos);
      return await this.pushSlackMessage(
        chatTool,
        user,
        message,
        MessageTriggerType.REMIND,
        channelId,
        null,
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
   * @param channelId
   * @returns
   */
  private async pushNotAssignListTaskMessageToAdmin(
    chatTool: ChatTool,
    user: User,
    todos: Todo[],
    channelId: string,
  ): Promise<any> {
    try {
      if (!user.slackId) {
        logger.error(new LoggerError(user.name + "がSlackIDが設定されていない。"));
        return;
      }

      //2. 担当者・期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_ASSIGN,
      };

      const message = SlackMessageBuilder.createNotifyUnassignedMessage(user, todos);
      return await this.pushSlackMessage(
        chatTool,
        user,
        message,
        MessageTriggerType.REMIND,
        channelId,
        null,
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
   * @param channelId
   * @returns
   */
  private async pushListTaskMessageToUser(
    chatTool: ChatTool,
    user: User,
    todos: Todo[],
    channelId: string,
  ): Promise<any> {
    try {
      if (!user.slackId) {
        logger.error(new LoggerError(user.name + "がSlackIDが設定されていない。"));
        return;
      }

      //3. 期日未設定に対するリマインド
      const remindTypes: IRemindType = {
        remindType: RemindType.REMIND_NOT_DEADLINE,
      };

      const isNotDoneTodos = todos.filter(todo => todo.is_done !== true);
      const message = SlackMessageBuilder.createNotifyNoDeadlineMessage(user, isNotDoneTodos);
      return await this.pushSlackMessage(
        chatTool,
        user,
        message,
        MessageTriggerType.REMIND,
        channelId,
        null,
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
   * @param channelId
   * @returns
   */
  private async pushNoListTaskMessageToAdmin(chatTool: ChatTool, user: User, channelId: string): Promise<any> {
    try {
      if (!user.slackId) {
        logger.error(new LoggerError(user.name + "がSlackIDが設定されていない。"));
        return;
      }

      const message = SlackMessageBuilder.createNotifyNothingMessage();
      return await this.pushSlackMessage(chatTool, user, message, MessageTriggerType.REMIND, channelId);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  public async getSuperiorUsers(slackId: string): Promise<User[]> {
    const users = await this.commonRepository.getChatToolUserByUserId(slackId);

    if (!users.length) {
      return Promise.resolve([]);
    }

    const userIds: number[] = users.map((user) => user.id).filter(Number);

    const reportingLineRepository = AppDataSource.getRepository(ReportingLine);
    const superiorUserIds = await reportingLineRepository.findBy({
      subordinate_user_id: In(userIds),
    });

    if (!superiorUserIds.length) {
      return Promise.resolve([]);
    }

    return await this.userRepository
      .createQueryBuilder("users")
      .where("id IN (:...ids)", {
        ids: superiorUserIds.map((superiorUserId) => superiorUserId.superior_user_id),
      })
      .getMany();
  }

  public async getSlackTodo(channelId: string, threadId: string): Promise<Todo> {
    const message = await this.messageRepository.findOneBy({
      channel_id: channelId,
      thread_id: threadId,
      todo_id: Not(IsNull()),
    });

    return await this.todoRepository.findOne({
      where: { id: message.todo_id },
      relations: ["todoapp", "company", "company.sections"],
    });
  }

  public async createMessage (chatMessage: ChatMessage): Promise<ChatMessage> {
    try {
      return await this.messageRepository.save(chatMessage);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  public async findMessageById(id: number): Promise<ChatMessage> {
    try {
      return await this.messageRepository.findOneBy({
        id: id,
      });
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  public async pushSlackMessage(
    chatTool: ChatTool,
    user: User,
    message: MessageAttachment,
    messageTriggerId: number,
    channelId: string,
    threadId?: string,
    _remindTypes?: IRemindType,
  ): Promise<ChatMessage> {
    if (process.env.ENV === "LOCAL") {
      console.log(SlackMessageBuilder.getTextContentFromMessage(message));
    } else {
      const response = await SlackBot.chat.postMessage({
        channel: channelId,
        thread_ts: threadId,
        text: "お知らせ",
        blocks: message.blocks,
      });
      if (response.ok) {
        return await this.saveChatMessage(chatTool, message, messageTriggerId, channelId, threadId, user);
      }
    }
  }

  public async replyMessage(
    chatTool: ChatTool,
    message: MessageAttachment,
    channelId: string,
    threadId: string,
    user?: User,
  ): Promise<any> {
    if (process.env.ENV === "LOCAL") {
      console.log(SlackMessageBuilder.getTextContentFromMessage(message));
    } else {
      const response = await SlackBot.chat.postMessage({
        channel: channelId,
        thread_ts: threadId,
        text: "お知らせ",
        blocks: message.blocks,
      });
      if (response.ok) {
        return await this.saveChatMessage(chatTool, message, MessageTriggerType.RESPONSE, channelId, threadId, user);
      }
    }
  }

  public async getUserFromSlackId(slackId: string): Promise<User> {
    const users = await this.commonRepository.getChatToolUserByUserId(slackId);
    return users.length ? users[0] : null;
  }

  private async pushTodoSlack(todoSlack: ITodoSlack, channelId: string): Promise<ChatMessage> {
    const { todo, chatTool, user, remindDays } = todoSlack;
    return await this.pushMessageRemind(chatTool, user, todo, remindDays, channelId);
  }

  private async saveChatMessage(
    chatTool: ChatTool,
    message: MessageAttachment,
    messageTriggerId: number,
    channelId: string,
    threadId: string,
    user?: User,
    remindTypes?: IRemindType,
    todo?: Todo,
  ): Promise<ChatMessage> {
    const remindType = remindTypes?.remindType ?? RemindType.NOT_REMIND;
    const remindDays = remindTypes?.remindDays ?? null;
    const chatMessage = new ChatMessage();
    chatMessage.is_from_user = SenderType.FROM_BOT;
    chatMessage.chattool_id = chatTool.id;
    chatMessage.is_opened = OpenStatus.OPENED;
    chatMessage.is_replied = ReplyStatus.NOT_REPLIED;
    chatMessage.message_trigger_id = messageTriggerId; // batch
    chatMessage.message_type_id = MessageType.TEXT;
    chatMessage.channel_id = channelId;
    chatMessage.thread_id = threadId;
    chatMessage.body = SlackMessageBuilder.getTextContentFromMessage(message);
    chatMessage.todo_id = todo?.id;
    chatMessage.send_at = toJapanDateTime(moment().utc().toDate());
    chatMessage.user_id = user?.id;
    chatMessage.remind_type = remindType;
    chatMessage.remind_before_days = remindDays;
    return await this.messageRepository.save(chatMessage);
  }

  private async getSendChannel(company: Company): Promise<string> {
    const companyId = company.id;
    const section = await this.sectionRepository.findOneBy({
      company_id: companyId,
      channel_id: Not(IsNull()),
    });
    return section?.channel_id;
  }

  public async remindTaskForAdminCompany(company: Company): Promise<void> {
    if (!company.adminUser) {
      logger.error(new LoggerError(company.name + "の管理者が設定していません。"));
    }
    const channelId = await this.getSendChannel(company);

    if (channelId) {
      const chattoolUsers = await this.commonRepository.getChatToolUsers();
      const needRemindTasks = await this.commonRepository.getNoDeadlineOrUnassignedTodos(company.id);

      // 期日未設定のタスクがない旨のメッセージが管理者に送られること
      if (needRemindTasks.length) {
        // 期日未設定のタスクがある場合
        const notSetDueDateAndNotAssign = needRemindTasks.filter(
          task => !task.deadline && !task.todoUsers.length,
        );

        if (notSetDueDateAndNotAssign.length) {
          const remindTasks = notSetDueDateAndNotAssign.filter(
            tasks => tasks.reminded_count < MAX_REMIND_COUNT,
          );

          // 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
          // Send to admin list task which not set duedate
          if (remindTasks.length) {
            for (const chattool of company.chatTools) {
              if (chattool.tool_code === ChatToolCode.SLACK && company.adminUser) {
                const adminUser = company.adminUser;
                const chatToolUser = chattoolUsers.find(
                  chattoolUser => chattoolUser.chattool_id === chattool.id && chattoolUser.user_id === adminUser.id,
                );

                if (chatToolUser) {
                  await this.pushListTaskMessageToAdmin(chattool, adminUser, remindTasks, channelId);
                }
              }
            }

            // await this.updateRemindedCount(remindTasks);
          }
        } else {
          for (const chattool of company.chatTools) {
            if (chattool.tool_code === ChatToolCode.SLACK && company.adminUser) {
              const adminUser = company.adminUser;
              const chatToolUser = chattoolUsers.find(
                (chattoolUser) =>
                  chattoolUser.chattool_id === chattool.id && chattoolUser.user_id === adminUser.id,
              );

              if (chatToolUser) {
                await this.pushNoListTaskMessageToAdmin(chattool, adminUser, channelId);
              }
            }
          }
        }

        // ・期日未設定のタスク一覧が1つのメッセージで担当者に送られること
        const notSetDueDateTasks = needRemindTasks.filter(
          task => !task.deadline && task.todoUsers.length && task.reminded_count < MAX_REMIND_COUNT,
        );

        // Send list task to each user
        if (notSetDueDateTasks.length) {
          const userTodoMap = this.mapUserTaskList(notSetDueDateTasks);

          for (const [userId, todos] of userTodoMap) {
            for (const chattool of company.chatTools) {
              if (chattool.tool_code === ChatToolCode.SLACK) {
                const user = todos[0].users.find(user => user.id === userId);
                const chatToolUser = chattoolUsers.find(
                  chattoolUser => chattoolUser.chattool_id === chattool.id && chattoolUser.user_id === userId
                );

                if (chatToolUser) {
                  await this.pushListTaskMessageToUser(chattool, user, todos, channelId);
                }
              }
            }
            // await this.updateRemindedCount(todos);
          }
        }

        // 担当者未設定・期日設定済みの場合
        const notSetAssignTasks = needRemindTasks.filter(
          task => task.deadline && !task.todoUsers.length && task.reminded_count < MAX_REMIND_COUNT,
        );

        if (notSetAssignTasks.length) {
          for (const chattool of company.chatTools) {
            if (chattool.tool_code === ChatToolCode.SLACK && company.adminUser) {
              const adminUser = company.adminUser;
              const chatToolUser = chattoolUsers.find(
                chattoolUser => chattoolUser.chattool_id === chattool.id && chattoolUser.user_id === adminUser.id,
              );

              if (chatToolUser) {
                await this.pushNotAssignListTaskMessageToAdmin(chattool, adminUser, notSetAssignTasks, channelId);
              }
            }
          }

          // await this.updateRemindedCount(notSetAssignTasks);
        }
      }
    } else {
      console.log("NOT channelId");
    }
  }

  private mapUserTaskList(todos: Todo[]): Map<number, Todo[]> {
    const map = new Map<number, Todo[]>();

    todos.forEach(todo => {
      for (const todoUser of todo.todoUsers) {
        if (map.has(todoUser.user.id)) {
          map.get(todoUser.user.id).push(todo);
        } else {
          map.set(todoUser.user.id, [todo]);
        }
      }
    });

    return map;
  }

  private mapUserRemindTaskList(
    remindTasks: Todo[],
    chatTool: ChatTool,
    chatToolUsers: ChatToolUser[],
  ): Map<number, ITodoSlack[]> {
    const map = new Map<number, ITodoSlack[]>();

    for (const remindTask of remindTasks) {
      const remindDays = diffDays(remindTask.deadline, toJapanDateTime(new Date()));
      for (const todoUser of remindTask.todoUsers) {
        const chatToolUser = chatToolUsers.find(
          chatToolUser => chatTool
            && chatToolUser.chattool_id === chatTool.id
            && chatToolUser.user_id === todoUser.user_id,
        );

        if (chatToolUser) {
          if (map.has(todoUser.user_id)) {
            map.get(todoUser.user_id).push({
              todo: remindTask,
              user: todoUser.user,
              chatTool,
              remindDays,
            });
          } else {
            map.set(todoUser.user_id, [
              {
                todo: remindTask,
                user: todoUser.user,
                chatTool,
                remindDays,
              },
            ]);
          }
        }
      }
    }

    return map;
  }

  public async remindTodayTaskForUser(company: Company): Promise<void> {
    const channelId = await this.getSendChannel(company);
    const chatToolUsers = await this.commonRepository.getChatToolUsers();
    const remindTasks: Todo[] = await this.getTodayRemindTasks(company, chatToolUsers);
    const chatTool = await this.chattoolRepository.findOneBy({ tool_code: ChatToolCode.SLACK });
    const userTodoMap = this.mapUserRemindTaskList(remindTasks, chatTool, chatToolUsers);

    const remindPerTodo = async (todoSlacks: ITodoSlack[]): Promise<void> => {
      await this.pushMessageStartRemindToUser(todoSlacks);
      await Promise.all(todoSlacks.map(todo => this.pushTodoSlack(todo, channelId)));
    };
    const todos = Array.from(userTodoMap.values());
    await Promise.all(todos.map(todo => remindPerTodo(todo)));
    await this.updateRemindedCount(remindTasks);
  }

  private async updateRemindedCount(todos: Todo[]): Promise<any> {
    const todoDatas = todos.map(todo => {
      return { ...todo, reminded_count: todo.reminded_count + 1 };
    });
    return await this.todoRepository.upsert(todoDatas, []);
  }

  private async getTodayRemindTasks(company: Company, chatToolUsers: ChatToolUser[]): Promise<Todo[]> {
    const dayReminds: number[] = await this.commonRepository.getDayReminds(company.companyConditions);
    const today = toJapanDateTime(new Date());

    const todayRemindTasks: Todo[] = [];

    const todos: Todo[] = await this.getRemindTodoTask(company);
    todos.forEach((todo) => {
      const dayDurations = diffDays(todo.deadline, today);

      if (dayReminds.includes(dayDurations)) {
        for (const todoUser of todo.todoUsers) {
          company.chatTools.forEach(async (chattool) => {
            if (chattool.tool_code === ChatToolCode.SLACK) {
              const chatToolUser = chatToolUsers.find(
                chattoolUser =>
                  chattoolUser.chattool_id === chattool.id &&
                  chattoolUser.user_id === todoUser.user_id,
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
  }

  private async getRemindTodoTask(company: Company, user?: User): Promise<Todo[]> {
    const today = toJapanDateTime(new Date());
    const dayReminds: number[] = await this.commonRepository.getDayReminds(company.companyConditions);

    const minValue = dayReminds.reduce(function(prev, curr) {
      return prev < curr ? prev : curr;
    });
    const maxValue = dayReminds.reduce(function(prev, curr) {
      return prev > curr ? prev : curr;
    });

    const minDate = moment(today)
      .add(-maxValue, "days")
      .startOf("day")
      .toDate();

    const maxDate = moment(today)
      .add(-minValue + 1, "days")
      .startOf("day")
      .toDate();

    const query = this.todoRepository
      .createQueryBuilder("todos")
      .leftJoinAndSelect("todos.todoUsers", "todo_users")
      .leftJoinAndSelect("todo_users.user", "users")
      .where("todos.is_done = :done", { done: false })
      .andWhere("todos.is_closed = :closed", { closed: false })
      .andWhere("todos.company_id = :company_id", { company_id: company.id })
      .andWhere("todos.reminded_count < :reminded_count", { reminded_count: MAX_REMIND_COUNT })
      .andWhere("todos.deadline >= :min_date", { min_date: minDate })
      .andWhere("todos.deadline <= :max_date", { max_date: maxDate })
      .andWhere("todo_users.deleted_at IS NULL");

    if (user) {
      query.andWhere("todo_users.user_id = :user_id", { user_id: user.id });
    }

    return await query.getMany();
  }
}
