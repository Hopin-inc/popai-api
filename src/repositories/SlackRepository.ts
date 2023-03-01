import { Container, Service } from "typedi";
import { In, IsNull, Not, Repository } from "typeorm";
import { Block, ChatPostMessageArguments, KnownBlock, MessageAttachment } from "@slack/web-api";
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

import CommonRepository from "./modules/CommonRepository";
import logger from "@/logger/winston";
import {
  ChatToolCode,
  MAX_REMIND_COUNT,
  MessageTriggerType,
  MessageType,
  OpenStatus, ProspectLevel,
  RemindType,
  ReplyStatus,
  SenderType, TodoHistoryAction,
} from "@/consts/common";
import { diffDays, getItemRandomly, getUniqueArray, Sorter, toJapanDateTime } from "@/utils/common";
import SlackBot from "@/config/slack-bot";
import AppDataSource from "@/config/data-source";
import { LoggerError } from "@/exceptions";
import { IDailyReportItems, IRemindType, valueOf } from "@/types";
import { ITodoSlack } from "@/types/slack";
import Prospect from "@/entities/transactions/Prospect";
import { reliefActions, SlackModalLabel } from "@/consts/slack";
import DailyReport from "@/entities/transactions/DailyReport";
import TodoAppUser from "@/entities/settings/TodoAppUser";

@Service()
export default class SlackRepository {
  private userRepository: Repository<User>;
  private messageRepository: Repository<ChatMessage>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;
  private sectionRepository: Repository<Section>;
  private chattoolRepository: Repository<ChatTool>;
  private prospectRepository: Repository<Prospect>;
  private dailyReportRepository: Repository<DailyReport>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.messageRepository = AppDataSource.getRepository(ChatMessage);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.commonRepository = Container.get(CommonRepository);
    this.sectionRepository = AppDataSource.getRepository(Section);
    this.chattoolRepository = AppDataSource.getRepository(ChatTool);
    this.prospectRepository = AppDataSource.getRepository(Prospect);
    this.dailyReportRepository = AppDataSource.getRepository(DailyReport);
  }

  public async sendDailyReport(company: Company) {
    try {
      const channelSectionsMap: Map<string, Section[]> = new Map();
      company.sections.forEach(section => {
        const channelId = section.channel_id;
        if (channelSectionsMap.has(section.channel_id)) {
          channelSectionsMap.get(channelId).push(section);
        } else {
          channelSectionsMap.set(channelId, [section]);
        }
      });
      const users = company.users.filter(u => u.chatTools.some(c => c.tool_code === ChatToolCode.SLACK));
      const [dailyReportTodos, notUpdatedTodos] = await Promise.all([
        this.commonRepository.getDailyReportItems(company),
        this.commonRepository.getNotUpdatedTodos(company),
      ]);

      const operations: ReturnType<typeof this.sendDailyReportForChannel>[] = [];
      channelSectionsMap.forEach((sections, channel) => {
        operations.push(this.sendDailyReportForChannel(
          dailyReportTodos,
          notUpdatedTodos,
          company,
          sections,
          users,
          channel,
        ));
      });
      await Promise.all(operations);
    } catch (error) {
      console.error(error);
      logger.error(new LoggerError(error.message));
    }
  }

  private async sendDailyReportForChannel(
    dailyReportTodos: IDailyReportItems,
    notUpdatedTodos: Todo[],
    company: Company,
    sections: Section[],
    users: User[],
    channel: string,
  ) {
    // const ts = await this.startDailyReport(company, channel);
    // await Promise.all(users.map(user => this.reportByUser(dailyReportTodos, company, sections, user, channel, ts)));

    await Promise.all(users.map(user => this.reportByUser(dailyReportTodos, company, sections, user, channel)));
    await this.suggestNotUpdatedTodo(notUpdatedTodos, company, sections, users, channel);
  }

  // private async startDailyReport(company: Company, channel: string): Promise<string> {
  //   const chatTool = company.chatTools.find(c => c.tool_code === ChatToolCode.SLACK);
  //   if (chatTool) {
  //     const message = SlackMessageBuilder.createStartDailyReportMessage();
  //     const { ts } = await this.pushSlackMessage(chatTool, null, message, MessageTriggerType.REPORT, channel);
  //     return ts;
  //   } else {
  //     return null;
  //   }
  // }

  private async reportByUser(
    items: IDailyReportItems,
    company: Company,
    sections: Section[],
    user: User,
    channel: string,
    ts?: string,
  ) {
    const chatTool = company.chatTools.find(c => c.tool_code === ChatToolCode.SLACK);
    const slackProfile = await this.getUserProfile(user.slackId);
    if (chatTool && slackProfile?.ok) {
      const iconUrl = slackProfile.profile.image_48;
      const message = SlackMessageBuilder.createDailyReportByUser(items, sections, user, iconUrl);
      const res = await this.pushSlackMessage(chatTool, user, message, MessageTriggerType.DAILY_REPORT, channel, ts);
      ts = ts ?? res?.ts;
      const dailyReport = new DailyReport(user, company, sections, items, channel, ts);
      await this.dailyReportRepository.save(dailyReport);
    }
  }

  private async suggestNotUpdatedTodo(
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
      return await this.saveChatMessage(
        chatTool,
        message,
        MessageTriggerType.REMIND,
        conversationId,
        result.ts,
        user,
        undefined,
        todo,
      );
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
    const users = await this.commonRepository.getChatToolUserByUserId(slackId);

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

    return await this.userRepository.find({
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
      return await this.todoRepository.findOne({
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
      console.log(SlackMessageBuilder.getTextContentFromMessage(message));
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
        await this.saveChatMessage(chatTool, message, messageTriggerId, channelId, ts, user);
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

  public async notifyOnCreated(savedTodo: Todo, assignees: User[], chatTool: ChatTool, editUser: TodoAppUser) {
    const message = SlackMessageBuilder.createNotifyOnCreatedMessage(savedTodo, assignees, editUser);
    await Promise.all(savedTodo.sections.map(section => this.pushSlackMessage(
      chatTool,
      null,
      message,
      MessageTriggerType.NOTIFY,
      section.channel_id,
    )));
  }

  public async notifyOnCompleted(savedTodo: Todo, chatTool: ChatTool, editUser: TodoAppUser) {
    const message = SlackMessageBuilder.createNotifyOnCompletedMessage(savedTodo, editUser);
    await Promise.all(savedTodo.sections.map(section => this.pushSlackMessage(
      chatTool,
      null,
      message,
      MessageTriggerType.NOTIFY,
      section.channel_id,
    )));
  }

  public async notifyOnAssigneeUpdated(
    savedTodo: Todo,
    action: valueOf<typeof TodoHistoryAction>,
    assignees: User[],
    chatTool: ChatTool,
    editUser: TodoAppUser
  ) {
    const message = SlackMessageBuilder.createNotifyOnAssigneeUpdatedMessage(savedTodo, action, assignees, editUser);
    await Promise.all(savedTodo.sections.map(section => this.pushSlackMessage(
      chatTool,
      null,
      message,
      MessageTriggerType.NOTIFY,
      section.channel_id,
    )));
  }

  public async notifyOnDeadlineUpdated(
    savedTodo: Todo,
    action: valueOf<typeof TodoHistoryAction>,
    deadline: Date,
    chatTool: ChatTool,
    editUser: TodoAppUser
  ) {
    const message = SlackMessageBuilder.createNotifyOnDeadlineUpdatedMessage(savedTodo, action, deadline, editUser);
    await Promise.all(savedTodo.sections.map(section => this.pushSlackMessage(
      chatTool,
      null,
      message,
      MessageTriggerType.NOTIFY,
      section.channel_id,
    )));
  }

  public async notifyOnClosedUpdated(
    savedTodo: Todo,
    action: valueOf<typeof TodoHistoryAction>,
    chatTool: ChatTool,
    editUser: TodoAppUser
  ) {
    const message = SlackMessageBuilder.createNotifyOnClosedUpdatedMessage(savedTodo, action, editUser);
    await Promise.all(savedTodo.sections.map(section => this.pushSlackMessage(
      chatTool,
      null,
      message,
      MessageTriggerType.NOTIFY,
      section.channel_id,
    )));
  }

  public async askProspects(company: Company, target?: { todos: Todo[], user: User }) {
    const chatTool = company.chatTools.find(chatTool => chatTool.tool_code === ChatToolCode.SLACK);
    const askedProspects: Prospect[] = [];
    if (chatTool) {
      const todos = target ? target.todos : await this.commonRepository.getActiveTodos(company);
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
    const todos = await this.commonRepository.getActiveTodos(user.company, user);
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
      this.todoRepository.findOne({
        where: { id: prospectRecord.todo_id },
        relations: [
          "company.implementedChatTools.chattool",
          "todoSections.section",
        ],
      }),
      this.userRepository.findOne({
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
    const dailyReports = await this.commonRepository.getDailyReportsToday(user.company, user);
    const report = dailyReports.sort(Sorter.byDate<DailyReport>("created_at")).slice(-1)[0];
    const [completedYesterday, delayed, ongoing] = await Promise.all(
      [report.todo_ids_yesterday, report.todo_ids_delayed, report.todo_ids_ongoing].map(ids => {
        return this.commonRepository.getTodosByIds(ids);
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
}
