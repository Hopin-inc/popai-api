import { Container, Service } from "typedi";
import { In, IsNull, Not, Repository } from "typeorm";
import {
  Block,
  ChatPostMessageArguments,
  ContextBlock,
  KnownBlock,
  MessageAttachment, MrkdwnElement,
  SectionBlock,
} from "@slack/web-api";
import moment from "moment";

import SlackMessageBuilder from "@/common/SlackMessageBuilder";

import ChatTool from "@/entities/masters/ChatTool";
import ChatToolUser from "@/entities/settings/ChatToolUser";
import Company from "@/entities/settings/Company";
import ChatMessage from "@/entities/transactions/ChatMessage";
import ReportingLine from "@/entities/settings/ReportingLine";
import Section from "@/entities/settings/Section";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";

import { TodoRepository } from "@/repositories/TodoRepository";
import { ChatToolUserRepository } from "@/repositories/ChatToolUserRepository";

import logger from "@/logger/winston";
import {
  ChatToolCode,
  MAX_REMIND_COUNT,
  MessageTriggerType,
  MessageType,
  ProspectLevel,
  RemindType,
  TodoHistoryAction,
} from "@/consts/common";
import { diffDays, getItemRandomly, getUniqueArray, Sorter, toJapanDateTime } from "@/utils/common";
import SlackBot from "@/config/slack-bot";
import AppDataSource from "@/config/data-source";
import { LoggerError } from "@/exceptions";
import { IDailyReportItems, IRemindType, valueOf } from "@/types";
import { ITodoSlack, SlackInteractionPayload } from "@/types/slack";
import Prospect from "@/entities/transactions/Prospect";
import { reliefActions, SlackModalLabel } from "@/consts/slack";
import DailyReport from "@/entities/transactions/DailyReport";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import DailyReportConfig from "@/entities/settings/DailyReportConfig";
import { INotionDailyReport } from "@/types/notion";
import { UserRepository } from "@/repositories/UserRepository";
import { SectionRepository } from "@/repositories/SectionRepository";
import { DailyReportRepository } from "@/repositories/DailyReportRepository";
import { CompanyConditionRepository } from "@/repositories/CompanyConditionRepository";

@Service()
export default class SlackRepository {
  private messageRepository: Repository<ChatMessage>;
  private chattoolRepository: Repository<ChatTool>;
  private prospectRepository: Repository<Prospect>;
  private dailyReportConfigRepository: Repository<DailyReportConfig>;

  constructor() {
    this.messageRepository = AppDataSource.getRepository(ChatMessage);
    this.chattoolRepository = AppDataSource.getRepository(ChatTool);
    this.prospectRepository = AppDataSource.getRepository(Prospect);
    this.dailyReportConfigRepository = AppDataSource.getRepository(DailyReportConfig);
  }

  public async reportByUser(
    items: IDailyReportItems,
    company: Company,
    sections: Section[],
    user: User,
    chatTool: ChatTool,
    channel: string,
    ts?: string,
    response?: INotionDailyReport[],
  ) {
    const slackProfile = await this.getUserProfile(user.slackId);
    if (chatTool && slackProfile?.ok) {
      const iconUrl = slackProfile.profile.image_48;
      const message = SlackMessageBuilder.createDailyReportByUser(items, sections, user, iconUrl);
      const res = await this.pushSlackMessage(chatTool, user, message, MessageTriggerType.DAILY_REPORT, channel, ts);

      ts = ts ?? res?.ts;
      const filteredRes = response.find(r => user.todoAppUsers.map(tu => tu.user_app_id === r.assignee));
      const dailyReport = new DailyReport(user, company, sections, items, channel, ts, filteredRes.pageId, filteredRes.docAppRegUrl);
      await DailyReportRepository.save(dailyReport);
    }
  }

  public async suggestNotUpdatedTodo(
    todos: Todo[],
    company: Company,
    sections: Section[],
    users: User[],
    channel: string,
  ) {
    const chatTool = company.chatTools.find(c => c.tool_code === ChatToolCode.SLACK);
    const targetTodo = getItemRandomly(todos.filter(
      todo => todo.sections.some(section => sections.some(s => s.id === section.id))),
    );
    const targetUser = getItemRandomly(users);
    if (targetTodo && targetUser) {
      const message = SlackMessageBuilder.createSuggestNotUpdatedTodoMessage(targetTodo, targetUser);
      await this.pushSlackMessage(chatTool, targetUser, message, MessageTriggerType.REPORT, channel);
    }
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
      const message = SlackMessageBuilder.createRemindMessage(user, todo, remindDays);
      if (process.env.ENV === "LOCAL") {
        console.log(message);
      } else {
        await this.sendDirectMessage(chatTool, user, message, todo);
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  private async sendDirectMessage(chatTool: ChatTool, user: User, message: MessageAttachment, todo?: Todo) {
    const response = await SlackBot.conversations.open({ users: user.slackId });
    const conversationId = response?.channel?.id;
    const result = await SlackBot.chat.postMessage({
      channel: conversationId,
      text: "お知らせ",
      blocks: message.blocks,
    });
    if (result.ok) {
      const chatMessage = new ChatMessage(
        chatTool,
        this.getTextFromSendMessage(message),
        MessageTriggerType.REMIND,
        MessageType.TEXT,
        user,
        conversationId,
        result.ts,
        null,
        todo,
        null,
      );
      return await this.messageRepository.save(chatMessage);
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
      const message = SlackMessageBuilder.createBeforeRemindMessage(user, todoSlacks);

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
      await this.pushSlackMessage(
        chatTool,
        user,
        message,
        MessageTriggerType.REMIND,
        channelId,
        null,
        { remindTypes },
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
      await this.pushSlackMessage(
        chatTool,
        user,
        message,
        MessageTriggerType.REMIND,
        channelId,
        null,
        { remindTypes },
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
      await this.pushSlackMessage(
        chatTool,
        user,
        message,
        MessageTriggerType.REMIND,
        channelId,
        null,
        { remindTypes },
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
      await this.pushSlackMessage(chatTool, user, message, MessageTriggerType.REMIND, channelId);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  public async getSuperiorUsers(slackId: string): Promise<User[]> {
    const users = await UserRepository.getChatToolUserByUserId(slackId);

    if (!users.length) {
      return Promise.resolve([]);
    }

    const userIds: number[] = users.map((user) => user.id).filter(Number);

    const reportingLineRepository = AppDataSource.getRepository(ReportingLine);
    const reportingLines = await reportingLineRepository.findBy({
      subordinate_user_id: In(userIds),
    });

    if (!reportingLines.length) {
      return Promise.resolve([]);
    }

    return await UserRepository.find({
      where: { id: In(reportingLines.map(record => record.superior_user_id)) },
      relations: ["chattoolUsers.chattool"],
    });
  }

  public async getSlackTodo(channelId: string, threadId: string): Promise<Todo> {
    const message = await this.messageRepository.findOneBy({
      channel_id: channelId,
      thread_id: threadId,
      todo_id: Not(IsNull()),
    });
    if (message) {
      return await TodoRepository.findOne({
        where: { id: message.todo_id },
        relations: ["todoapp", "company", "company.sections"],
      });
    } else {
      return null;
    }
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
    message: { blocks: (Block | KnownBlock)[], attachments?: MessageAttachment[] },
    messageTriggerId: number,
    channelId: string,
    threadId?: string,
    _options?: {
      remindTypes?: IRemindType,
    },
  ) {
    if (process.env.ENV === "LOCAL") {
      console.log(this.getTextFromSendMessage(message));
    } else {
      const props: ChatPostMessageArguments = {
        channel: channelId,
        thread_ts: threadId,
        text: "お知らせ",
        blocks: message.blocks,
        attachments: message.attachments,
      };
      const response = await SlackBot.chat.postMessage(props);
      if (response.ok) {
        const ts = threadId ? threadId : response.ts;
        const chatMessage = new ChatMessage(
          chatTool,
          this.getTextFromSendMessage(message),
          messageTriggerId,
          MessageType.TEXT,
          user,
          channelId,
          ts,
        );
        await this.messageRepository.save(chatMessage);
      }
      return response;
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
      console.log(this.getTextFromSendMessage(message));
    } else {
      const response = await SlackBot.chat.postMessage({
        channel: channelId,
        thread_ts: threadId,
        text: "お知らせ",
        blocks: message.blocks,
      });
      if (response.ok) {
        const chatMessage = new ChatMessage(
          chatTool,
          this.getTextFromSendMessage(message),
          MessageTriggerType.RESPONSE,
          MessageType.TEXT,
          user,
          channelId,
          threadId,
        );
        return await this.messageRepository.save(chatMessage);
      }
    }
  }

  public async getUserFromSlackId(slackId: string): Promise<User> {
    const users = await UserRepository.getChatToolUserByUserId(slackId);
    return users.length ? users[0] : null;
  }

  private async pushTodoSlack(todoSlack: ITodoSlack, channelId: string): Promise<ChatMessage> {
    const { todo, chatTool, user, remindDays } = todoSlack;
    return await this.pushMessageRemind(chatTool, user, todo, remindDays, channelId);
  }

  private async getSendChannel(company: Company): Promise<string> {
    const companyId = company.id;
    const section = await SectionRepository.findOneBy({
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
      const chattoolUsers = await ChatToolUserRepository.find();
      const needRemindTasks = await TodoRepository.getNoDeadlineOrUnassignedTodos(company.id);

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
                  chattoolUser => chattoolUser.chattool_id === chattool.id && chattoolUser.user_id === userId,
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
      const remindDays = diffDays(toJapanDateTime(remindTask.deadline), toJapanDateTime(new Date()));
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
    const chatToolUsers = await ChatToolUserRepository.find();
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
    return await TodoRepository.upsert(todoDatas, []);
  }

  private async getTodayRemindTasks(company: Company, chatToolUsers: ChatToolUser[]): Promise<Todo[]> {
    const dayReminds: number[] = await CompanyConditionRepository.getDayReminds(company.companyConditions);

    const todayRemindTasks: Todo[] = [];

    const todos: Todo[] = await this.getRemindTodoTask(company);
    todos.forEach(todo => {
      const dayDurations = todo.deadline ? diffDays(toJapanDateTime(todo.deadline), toJapanDateTime(new Date())) : null;

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
    const dayReminds: number[] = await CompanyConditionRepository.getDayReminds(company.companyConditions);

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

    return await TodoRepository.getRemindTodos(company, minDate, maxDate, user);
  }

  public async notifyOnCreated(savedTodo: Todo, assignees: User[], chatTool: ChatTool, editUser: TodoAppUser, channelId: string) {
    const message = SlackMessageBuilder.createNotifyOnCreatedMessage(savedTodo, assignees, editUser);
    await this.pushSlackMessage(
      chatTool,
      null,
      message,
      MessageTriggerType.NOTIFY,
      channelId,
    );
  }

  public async notifyOnCompleted(savedTodo: Todo, chatTool: ChatTool, editUser: TodoAppUser, channelId: string) {
    const message = SlackMessageBuilder.createNotifyOnCompletedMessage(savedTodo, editUser);
    await this.pushSlackMessage(
      chatTool,
      null,
      message,
      MessageTriggerType.NOTIFY,
      channelId,
    );
  }

  public async notifyOnAssigneeUpdated(
    savedTodo: Todo,
    action: valueOf<typeof TodoHistoryAction>,
    assignees: User[],
    chatTool: ChatTool,
    editUser: TodoAppUser,
    channelId: string,
  ) {
    const message = SlackMessageBuilder.createNotifyOnAssigneeUpdatedMessage(savedTodo, action, assignees, editUser);
    await this.pushSlackMessage(
      chatTool,
      null,
      message,
      MessageTriggerType.NOTIFY,
      channelId,
    );
  }

  public async notifyOnDeadlineUpdated(
    savedTodo: Todo,
    action: valueOf<typeof TodoHistoryAction>,
    deadline: Date,
    chatTool: ChatTool,
    editUser: TodoAppUser,
    channelId: string,
  ) {
    const message = SlackMessageBuilder.createNotifyOnDeadlineUpdatedMessage(savedTodo, action, deadline, editUser);
    await this.pushSlackMessage(
      chatTool,
      null,
      message,
      MessageTriggerType.NOTIFY,
      channelId,
    );
  }

  public async notifyOnClosedUpdated(
    savedTodo: Todo,
    action: valueOf<typeof TodoHistoryAction>,
    chatTool: ChatTool,
    editUser: TodoAppUser,
    channelId: string,
  ) {
    const message = SlackMessageBuilder.createNotifyOnClosedUpdatedMessage(savedTodo, action, editUser);
    await this.pushSlackMessage(
      chatTool,
      null,
      message,
      MessageTriggerType.NOTIFY,
      channelId,
    );
  }

  public async askProspects(company: Company, target?: { todos: Todo[], user: User }) {
    const chatTool = company.chatTools.find(chatTool => chatTool.tool_code === ChatToolCode.SLACK);
    const askedProspects: Prospect[] = [];
    if (chatTool) {
      const todos = target ? target.todos : await TodoRepository.getActiveTodos(company);
      await Promise.all(todos.map(async todo => {
        const message = SlackMessageBuilder.createAskProspectMessage(todo);
        const users = target ? [target.user] : todo.users;
        await Promise.all(users.map(async user => {
          const { thread_id: ts, channel_id: channelId } = await this.sendDirectMessage(chatTool, user, message, todo);
          const prospect = new Prospect(todo.id, user.id, company.id, ts, channelId);
          askedProspects.push(prospect);
        }));
      }));
    }
    await this.prospectRepository.upsert(askedProspects, []);
  }

  public async askPlans(company: Company, milestone?: string) {
    const chatTool = company.chatTools.find(chatTool => chatTool.tool_code === ChatToolCode.SLACK);
    const message = SlackMessageBuilder.createAskPlansMessage(milestone);
    if (chatTool) {
      await Promise.all(company.users.map(user => this.sendDirectMessage(chatTool, user, message)));
    }
  }

  public async respondToProspect(
    chatTool: ChatTool,
    user: User,
    slackId: string,
    prospect: number,
    channelId: string,
    threadId: string,
  ) {
    const todo = await this.getSlackTodo(channelId, threadId);
    const where = { todo_id: todo.id, slack_ts: threadId };
    const { blocks } = SlackMessageBuilder.createAskActionMessageAfterProspect(todo, prospect);
    const [slackProfile] = await Promise.all([
      this.getUserProfile(user.slackId),
      SlackBot.chat.update({ channel: channelId, ts: threadId, text: todo.name, blocks }),
      this.prospectRepository.update(where, { prospect, prospect_responded_at: new Date() }),
    ]);
    if (prospect >= ProspectLevel.GOOD) {
      await this.updateDailyReportWithProspects(user, slackProfile?.profile?.image_48);
    }
  }

  public async respondToReliefAction(
    chatTool: ChatTool,
    user: User,
    slackId: string,
    action: number,
    channelId: string,
    threadId: string,
  ) {
    const todo = await this.getSlackTodo(channelId, threadId);
    const where = { todo_id: todo.id, slack_ts: threadId };
    const { prospect } = await this.prospectRepository.findOneBy(where);
    await this.prospectRepository.update(where, { action, action_responded_at: new Date() });
    const { blocks } = SlackMessageBuilder.createAskCommentMessageAfterReliefAction(todo, prospect, action);
    await SlackBot.chat.update({ channel: channelId, ts: threadId, text: todo.name, blocks });
  }

  public async openReliefCommentModal(channelId: string, threadId: string, triggerId: string) {
    const where = { slack_channel_id: channelId, slack_ts: threadId };
    const { action } = await this.prospectRepository.findOneBy(where);
    const targetAction = reliefActions.find(a => a.value === action);
    const blocks = SlackMessageBuilder.createReliefCommentModal();
    const viewId = await this.openModal(
      triggerId,
      `${targetAction.text}について相談する`,
      blocks,
      SlackModalLabel.RELIEF_COMMENT,
    );
    await this.prospectRepository.update(where, { slack_view_id: viewId });
  }

  public async openPlanModal(user: User, channelId: string, triggerId: string, milestoneText: string) {
    const todos = await TodoRepository.getActiveTodos(user.company, user);
    const blocks = SlackMessageBuilder.createAskPlanModal(todos, milestoneText);
    await this.openModal(triggerId, "着手するタスクを決める", blocks, SlackModalLabel.PLAN);
  }

  public async receiveReliefComment(viewId: string, comment: string) {
    const prospectRecord = await this.prospectRepository.findOneBy({ slack_view_id: viewId });
    await this.prospectRepository.update(prospectRecord.id, { comment, comment_responded_at: new Date() });
    return prospectRecord;
  }

  public async shareReliefCommentAndUpdateDailyReport(viewId: string, comment: string, prospectRecord: Prospect) {
    const [todo, user] = await Promise.all([
      TodoRepository.findOne({
        where: { id: prospectRecord.todo_id },
        relations: [
          "company.implementedChatTools.chattool",
          "todoSections.section",
        ],
      }),
      UserRepository.findOne({
        where: { id: prospectRecord.user_id },
        relations: ["chattoolUsers.chattool"],
      }),
    ]);
    const slackProfile = await this.getUserProfile(user.slackId);
    const iconUrl = slackProfile?.profile?.image_48;
    await this.shareReliefComment(todo, user, prospectRecord, comment, iconUrl);
    await this.updateDailyReportWithProspects(user, iconUrl);
  }

  private async shareReliefComment(todo: Todo, user: User, prospectRecord: Prospect, comment: string, iconUrl: string) {
    const { prospect, action, slack_channel_id: channel, slack_ts: ts } = prospectRecord;
    const { blocks: editedMsg } = SlackMessageBuilder.createThanksForCommentMessage(todo, prospect, action, comment);
    const sharedChannels = getUniqueArray(todo.sections.map(section => section.channel_id));
    const shareMsg = SlackMessageBuilder.createShareReliefMessage(todo, user, prospect, action, comment, iconUrl);
    const chatTool = todo.company.chatTools.find(c => c.tool_code === ChatToolCode.SLACK);
    const [_, superiorUsers, ...pushedMessages] = await Promise.all([
      SlackBot.chat.update({ channel, ts, text: todo.name, blocks: editedMsg }),
      this.getSuperiorUsers(user.slackId),
      ...sharedChannels.map(ch => this.pushSlackMessage(chatTool, user, shareMsg, MessageTriggerType.REPORT, ch)),
    ]);
    const promptMsg = SlackMessageBuilder.createPromptDiscussionMessage(superiorUsers);
    await Promise.all(pushedMessages.map(m => {
      this.pushSlackMessage(chatTool, null, promptMsg, MessageTriggerType.REPORT, m.channel, m.ts);
    }));
  }

  private async updateDailyReportWithProspects(user: User, iconUrl: string) {
    const dailyReports = await DailyReportRepository.getDailyReportsToday(user.company, user);
    const report = dailyReports.sort(Sorter.byDate<DailyReport>("created_at")).slice(-1)[0];
    const [completedYesterday, delayed, ongoing] = await Promise.all(
      [report.todo_ids_yesterday, report.todo_ids_delayed, report.todo_ids_ongoing].map(ids => {
        return TodoRepository.getTodosByIds(ids);
      }),
    );
    const items: IDailyReportItems = { completedYesterday, delayed, ongoing };
    const { blocks: dailyReportMsg } = SlackMessageBuilder.createDailyReportWithProspect(report, items, iconUrl);
    await SlackBot.chat.update({
      channel: report.slack_channel_id,
      ts: report.slack_ts,
      blocks: dailyReportMsg,
      text: `${user.name}さんの日報`,
    });
  }

  private async getUserProfile(slackId: string) {
    return await SlackBot.users.profile.get({ user: slackId });
  }

  private async openModal(
    triggerId: string,
    title: string,
    blocks: KnownBlock[],
    callbackId: string,
    submit: string = "送信する",
    close: string = "キャンセル",
  ) {
    const { ok, view } = await SlackBot.views.open({
      trigger_id: triggerId,
      view: {
        type: "modal",
        title: { type: "plain_text", emoji: true, text: title },
        submit: { type: "plain_text", emoji: true, text: submit },
        close: { type: "plain_text", emoji: true, text: close },
        blocks,
        callback_id: callbackId,
      },
    });
    if (ok && view) {
      return view.id;
    }
  }

  private getTextFromSendMessage(message: MessageAttachment) {
    const blocks = message.blocks as KnownBlock[];
    const noticeBlock = blocks[0];
    const noticeBlockType = blocks[0].type;

    switch (noticeBlockType) {
      case "context":
        const noticeContextBlock = noticeBlock as ContextBlock;
        const noticeElement = noticeContextBlock.elements.find(e => e.type === "mrkdwn") as MrkdwnElement;
        return noticeElement.text;
      case "section":
        const noticeSectionBlock = noticeBlock as SectionBlock;
        if (noticeSectionBlock.fields) {
          return noticeSectionBlock.fields.map(f => f.text)?.join("\n") ?? "";
        } else {
          return noticeSectionBlock.text.text;
        }
    }
  }

  public getTextFromResponse(payload: SlackInteractionPayload) {
    switch (payload.type) {
      case "block_actions":
        return payload.actions.map(a => a.text)?.join("\n") ?? "";
    }
  }
}
