import {
  Between,
  Brackets,
  FindOptionsWhere,
  In,
  IsNull,
  LessThan,
  Not,
  Repository,
  SelectQueryBuilder,
} from "typeorm";
import { Container, Service } from "typedi";
import dayjs from "dayjs";

import ImplementedTodoApp from "@/entities/settings/ImplementedTodoApp";
import Company from "@/entities/settings/Company";
import ChatToolUser from "@/entities/settings/ChatToolUser";
import Section from "@/entities/settings/Section";
import SectionLabel from "@/entities/settings/SectionLabel";
import Todo from "@/entities/transactions/Todo";
import TodoHistory from "@/entities/transactions/TodoHistory";
import TodoUser from "@/entities/transactions/TodoUser";
import User from "@/entities/settings/User";
import CompanyCondition from "@/entities/settings/CompanyCondition";
import PropertyOption from "@/entities/settings/PropertyOption";

import AppDataSource from "@/config/data-source";
import logger from "@/logger/winston";
import { LoggerError } from "@/exceptions";
import { IDailyReportItems, valueOf } from "@/types";
import {
  TodoHistoryProperty as Property,
  TodoHistoryAction as Action,
  NOT_UPDATED_DAYS,
  EventType, TodoAppCode, ChatToolCode, MessageTriggerType,
} from "@/consts/common";
import EventTiming from "@/entities/settings/EventTiming";
import { getItemRandomly, roundMinutes, toJapanDateTime } from "@/utils/common";
import DailyReport from "@/entities/transactions/DailyReport";
import TodoApp from "@/entities/masters/TodoApp";
import { GetPageResponse, PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { Client } from "@notionhq/client";
import DailyReportConfig from "@/entities/settings/DailyReportConfig";
import SlackRepository from "@/repositories/SlackRepository";
import LineRepository from "@/repositories/LineRepository";
import SlackMessageBuilder from "@/common/SlackMessageBuilder";
import LineMessageBuilder from "@/common/LineMessageBuilder";

@Service()
export default class CommonRepository {
  private sectionRepository: Repository<Section>;
  private labelSectionRepository: Repository<SectionLabel>;
  private userRepository: Repository<User>;
  private implementedTodoAppRepository: Repository<ImplementedTodoApp>;
  private chatToolUserRepository: Repository<ChatToolUser>;
  private todoRepository: Repository<Todo>;
  private todoHistoryRepository: Repository<TodoHistory>;
  private eventTimingRepository: Repository<EventTiming>;
  private dailyReportRepository: Repository<DailyReport>;
  private propertyOptionRepository: Repository<PropertyOption>;
  private dailyReportConfigRepository: Repository<DailyReportConfig>;
  private slackRepository: SlackRepository;
  private lineRepository: LineRepository;
  private notionRequest: Client;

  constructor() {
    this.sectionRepository = AppDataSource.getRepository(Section);
    this.labelSectionRepository = AppDataSource.getRepository(SectionLabel);
    this.userRepository = AppDataSource.getRepository(User);
    this.implementedTodoAppRepository = AppDataSource.getRepository(ImplementedTodoApp);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.chatToolUserRepository = AppDataSource.getRepository(ChatToolUser);
    this.todoHistoryRepository = AppDataSource.getRepository(TodoHistory);
    this.eventTimingRepository = AppDataSource.getRepository(EventTiming);
    this.dailyReportRepository = AppDataSource.getRepository(DailyReport);
    this.propertyOptionRepository = AppDataSource.getRepository(PropertyOption);
    this.dailyReportConfigRepository = AppDataSource.getRepository(DailyReportConfig);
    this.slackRepository = Container.get(SlackRepository);
    this.lineRepository = Container.get(LineRepository);
    this.notionRequest = new Client({ auth: process.env.NOTION_ACCESS_TOKEN });
  }

  public async getSections(companyId: number, todoappId: number): Promise<Section[]> {
    return await this.sectionRepository
      .createQueryBuilder("sections")
      .innerJoinAndSelect(
        "sections.boardAdminUser",
        "users",
        "sections.board_admin_user_id = users.id AND users.company_id = :companyId",
        { companyId },
      )
      .innerJoinAndSelect(
        "users.todoAppUsers",
        "todo_app_users",
        "users.id = todo_app_users.employee_id AND todo_app_users.todoapp_id = :todoappId",
        { todoappId },
      )
      .where("sections.company_id = :companyId", { companyId })
      .andWhere("sections.todoapp_id = :todoappId", { todoappId })
      .andWhere("sections.board_id IS NOT NULL")
      .getMany();
  }

  public async getBoardAdminUser(sectionId: number): Promise<User> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ["boardAdminUser", "boardAdminUser.todoAppUsers"],
    });
    return section.boardAdminUser;
  }

  public async getImplementTodoApp(companyId: number, todoappId: number): Promise<ImplementedTodoApp> {
    const implementTodoApp = await this.implementedTodoAppRepository.findOneBy({
      company_id: companyId,
      todoapp_id: todoappId,
    });

    if (!implementTodoApp) {
      logger.error(new LoggerError(
        `implemented_todo_appsのデータ(company_id=${companyId}, todoapp_id=${todoappId})がありません。`,
      ));
    }
    return implementTodoApp;
  }

  public async getChatToolUsers(): Promise<ChatToolUser[]> {
    return await this.chatToolUserRepository.find();
  }

  public async getChatToolUser(userId: number, chatToolId: number): Promise<ChatToolUser> {
    const chatToolUser = await this.chatToolUserRepository.findOneBy({
      user_id: userId,
      chattool_id: chatToolId,
      auth_key: Not(IsNull()),
    });

    if (!chatToolUser) {
      logger.error(new LoggerError(
        `chat_tool_usersのデータ(user_id=${userId}, chattool_id=${chatToolId})がありません。`,
      ));
    }
    return chatToolUser;
  }

  public async getChatToolUserByUserId(
    authKey: string,
    relations: string[] = ["chattoolUsers.chattool", "company.implementedChatTools.chattool"],
  ): Promise<User[]> {
    return await this.userRepository.find({
      where: { chattoolUsers: { auth_key: authKey } },
      relations,
    });
  }

  public async getDayReminds(companyConditions: CompanyCondition[]): Promise<number[]> {
    return companyConditions
      .map((s) => s.remind_before_days)
      .filter(Number.isFinite);
  }

  public async getNoDeadlineOrUnassignedTodos(companyId: number): Promise<Todo[]> {
    const notExistsQuery = <T>(builder: SelectQueryBuilder<T>) =>
      `not exists (${builder.getQuery()})`;
    return await this.todoRepository
      .createQueryBuilder("todos")
      .leftJoinAndSelect("todos.todoUsers", "todo_users")
      .leftJoinAndSelect("todo_users.user", "users")
      .leftJoinAndSelect("users.chattoolUsers", "chat_tool_users")
      .leftJoinAndSelect("chat_tool_users.chattool", "chat_tool")
      .where("todos.company_id = :companyId", { companyId })
      .andWhere("todos.is_closed =:closed", { closed: false })
      .andWhere("todos.is_done =:done", { done: false })
      .andWhere(
        new Brackets((qb) => {
          qb.where("todos.deadline IS NULL").orWhere(
            notExistsQuery(
              AppDataSource.getRepository(TodoUser)
                .createQueryBuilder("todo_users")
                .where("todo_users.todo_id = todos.id")
                .andWhere("todo_users.user_id IS NOT NULL"),
            ),
          );
        }),
      )
      .getMany();
  }

  public async sendDailyReport(company: Company, chatToolCode: string) {
    try {
      const channelSectionsMap: Map<string, Section[]> = new Map();
      const configRecord = await this.dailyReportConfigRepository.findOneBy({
        company_id: company.id,
        enabled: true,
      });
      const channelId = configRecord.channel;
      company.sections.forEach(section => {
        if (channelSectionsMap.has(channelId)) {
          channelSectionsMap.get(channelId).push(section);
        } else {
          channelSectionsMap.set(channelId, [section]);
        }
      });

      const users = company.users.filter(u => u.chatTools.some(c => c.tool_code === chatToolCode));

      const [dailyReportTodos, notUpdatedTodos] = await Promise.all([
        this.getDailyReportItems(company),
        this.getNotUpdatedTodos(company),
      ]);

      const operations: ReturnType<typeof this.sendDailyReportForChannel>[] = [];
      channelSectionsMap.forEach((sections, channel) => {
        operations.push(this.sendDailyReportForChannel(
          dailyReportTodos,
          notUpdatedTodos,
          company,
          sections,
          users,
          chatToolCode,
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
    chatToolCode: string,
    channel: string,
  ) {
    switch (chatToolCode) {
      case ChatToolCode.SLACK:
        await Promise.all(users.map(user => this.slackRepository.reportByUser(dailyReportTodos, company, sections, user, channel)));
        await this.suggestNotUpdatedTodo(notUpdatedTodos, company, sections, users, channel);
        break;
      case ChatToolCode.LINE:
        const chatTool = company.chatTools.find(c => c.tool_code === ChatToolCode.LINE);
        // const message = lineMecreateDailyReportByCompany(users, dailyReportTodos);
        // await this.lineRepository.pushLineMessage(chatTool, message, MessageTriggerType.DAILY_REPORT, null, null, channel);
        break;
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
      await this.slackRepository.pushSlackMessage(chatTool, targetUser, message, MessageTriggerType.REPORT, channel);
    }
  }

  public async getDailyReportItems(company: Company): Promise<IDailyReportItems> {
    const [completedYesterday, delayed, ongoing] = await Promise.all([
      this.getTodosCompletedYesterday(company),
      this.getTodosDelayed(company),
      this.getTodosOngoing(company),
    ]);
    return { completedYesterday, delayed, ongoing };
  }

  private async getTodosCompletedYesterday(company: Company): Promise<Todo[]> {
    const yesterday = dayjs().subtract(1, "d");
    const targetHistories = await this.todoHistoryRepository.createQueryBuilder("history")
      .innerJoinAndSelect("history.todo", "todo")
      .where("todo.company_id = :companyId", { companyId: company.id })
      .andWhere(
        "history.created_at BETWEEN :start AND :end",
        { start: yesterday.startOf("d").toDate(), end: yesterday.endOf("d").toDate() },
      )
      .andWhere("history.property = :property", { property: Property.IS_DONE })
      .andWhere("history.action = :action", { action: Action.CREATE })
      .getMany();
    const targetTodoIds = targetHistories.map(history => history.todo_id);
    const todos = await this.todoRepository.find({
      where: { id: In(targetTodoIds) },
      relations: ["histories", "todoUsers.user", "todoSections.section"],
    });
    return todos.filter(todo => {
      if (todo.histories) {
        const histories = todo.histories
          .filter(h => h.property === Property.IS_DONE)
          .sort((a, b) => a.created_at > b.created_at ? 1 : -1);
        return histories && histories.length && histories.slice(-1)[0].action === Action.CREATE;
      } else {
        return false;
      }
    });
  }

  private async getTodosDelayed(company: Company): Promise<Todo[]> {
    const startOfToday = dayjs().startOf("d").toDate();
    const delayedTodos = await this.todoRepository.find({
      where: {
        company_id: company.id,
        deadline: LessThan(startOfToday),
        is_closed: false,
        is_done: false,
      },
      relations: ["todoUsers.user", "todoSections.section", "todoapp"],
    });

    return this.getNotArchivedTodos(delayedTodos);
  }

  private async getTodosOngoing(company: Company): Promise<Todo[]> {
    const startOfToday = dayjs().startOf("d").toDate();
    const endOfToday = dayjs().endOf("d").toDate();
    const onGoingTodos = await this.todoRepository.find({
      where: {
        company_id: company.id,
        deadline: Between(startOfToday, endOfToday),
        is_closed: false,
        is_done: false,
      },
      relations: ["todoUsers.user", "todoSections.section", "todoapp"],
    });

    return this.getNotArchivedTodos(onGoingTodos);
  }

  public async getNotUpdatedTodos(company: Company): Promise<Todo[]> {
    const thresholdDate = dayjs().subtract(NOT_UPDATED_DAYS, "d").startOf("d").toDate();
    return await this.todoRepository.find({
      where: {
        company_id: company.id,
        updated_at: LessThan(thresholdDate),
        is_done: false,
        is_closed: false,
      },
      relations: ["todoUsers.user", "todoSections.section"],
    });
  }

  public async getEventTargetCompanies(significance: number, event: valueOf<typeof EventType>): Promise<EventTiming[]> {
    const now = toJapanDateTime(new Date());
    const executedTimeRounded = roundMinutes(now, significance, "floor");
    const time = dayjs(executedTimeRounded).format("HH:mm:ss");
    const day = dayjs(now).day();
    const timings = await this.eventTimingRepository.find({
      where: { time, event },
      relations: [
        "company.sections",
        "company.users.chattoolUsers.chattool",
        "company.implementedChatTools.chattool",
        "company.adminUser.chattoolUsers.chattool",
      ],
    });
    return timings.filter(t => t.days_of_week.includes(day));
  }

  public async getActiveTodos(company: Company, user?: User): Promise<Todo[]> {
    const filterByUser: FindOptionsWhere<Todo> = user ? { todoUsers: { user_id: user.id } } : {};
    const startDate = dayjs().startOf("day").toDate();
    const endDate = dayjs().endOf("day").toDate();
    return await this.todoRepository.find({
      where: {
        company_id: company.id,
        deadline: Between(startDate, endDate),
        is_done: false,
        is_closed: false,
        ...filterByUser,
      },
      relations: ["todoUsers.user.chattoolUsers.chattool", "todoSections.section"],
    });
  }

  public async getDailyReportsToday(
    company?: Company,
    user?: User,
    date: Date = new Date(),
    sections?: Section[],
  ): Promise<DailyReport[]> {
    const start = dayjs(date).startOf("day").toDate();
    const end = dayjs(date).endOf("day").toDate();
    const findByCompany: FindOptionsWhere<DailyReport> = company ? { company_id: company.id } : {};
    const findByUser: FindOptionsWhere<DailyReport> = user ? { user_id: user.id } : {};
    const where: FindOptionsWhere<DailyReport> = {
      ...findByCompany,
      ...findByUser,
      created_at: Between(start, end),
    };
    const dailyReports = await this.dailyReportRepository.find({ where, relations: ["user"] });
    if (sections) {
      dailyReports.filter(report => sections.some(section => report.section_ids.includes(section.id)));
    }
    return dailyReports;
  }

  public async getTodosByIds(
    ids: number[],
    relations: string[] = ["todoUsers.user", "todoSections.section", "prospects"],
  ): Promise<Todo[]> {
    return await this.todoRepository.find({ where: { id: In(ids) }, relations });
  }

  public async getLastUpdatedDate(company: Company, todoapp: TodoApp): Promise<Date> {
    const companyId = company.id;
    const todoAppId = todoapp.id;

    const lastUpdatedRecord = await this.todoHistoryRepository
      .createQueryBuilder("todo_histories")
      .leftJoinAndSelect(
        "todo_histories.todo",
        "todos",
        "todo_histories.todo_id = todos.id")
      .where("todos.company_id = :companyId", { companyId: companyId })
      .andWhere("todos.todoapp_id = :todoappId", { todoappId: todoAppId })
      .orderBy("todo_histories.todoapp_reg_updated_at", "DESC")
      .getOne();

    return lastUpdatedRecord.todoapp_reg_updated_at;
  }

  public async getNotArchivedTodos(todos: Todo[]): Promise<Todo[]> {
    const archivedPages: PageObjectResponse[] = [];
    await Promise.all(todos.map(async todo => {
      if (todo.todoapp.todo_app_code === TodoAppCode.NOTION) {
        const archivedPage = await this.syncArchivedTrue(todo.todoapp_reg_id);
        if (archivedPage.archived === true) {
          archivedPages.push(await archivedPage);
        }
      }
    }));
    if (archivedPages) {
      return todos.filter(todo => !archivedPages?.some(page => page.id === todo.todoapp_reg_id ?? true));
    } else {
      return todos;
    }
  }

  public async syncArchivedTrue(todoappRegId: string) {
    const isPageResponse: GetPageResponse = await this.notionRequest.pages.retrieve({ page_id: todoappRegId });
    if ("object" in isPageResponse && "properties" in isPageResponse) {
      const pageResponse: PageObjectResponse = isPageResponse;
      if (pageResponse.archived === true) {
        const deletedPageRecord = await this.todoRepository.find({ where: { todoapp_reg_id: todoappRegId } });
        await this.todoRepository.softRemove(deletedPageRecord);
      }
      return pageResponse;
    }
  }
}
