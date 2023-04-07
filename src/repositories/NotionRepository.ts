import {
  CreatePageResponse,
  PageObjectResponse,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { Container, Service } from "typedi";

import Todo from "@/entities/transactions/Todo";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import TodoApp from "@/entities/masters/TodoApp";
import Company from "@/entities/settings/Company";
import Section from "@/entities/settings/Section";
import User from "@/entities/settings/User";

import TodoHistoryService from "@/services/TodoHistoryService";

import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import { TodoHistoryRepository } from "@/repositories/transactions/TodoHistoryRepository";
import { TodoUserRepository } from "@/repositories/transactions/TodoUserRepository";
import { TodoSectionRepository } from "@/repositories/transactions/TodoSectionRepository";
import { SectionRepository } from "@/repositories/settings/SectionRepository";

import { diffDays, toJapanDateTime } from "@/utils/common";
import logger from "@/logger/winston";
import {
  IDailyReportItems,
  IRemindTask,
  ITodoHistory,
  ITodoSectionUpdate,
  ITodoTask,
  ITodoUserUpdate,
  ValueOf,
} from "@/types";
import { INotionDailyReport, INotionTask } from "@/types/notion";
import { DocumentToolCode, UsageType } from "@/consts/common";
import NotionPageBuilder from "@/common/NotionPageBuilder";
import SlackMessageBuilder from "@/common/SlackMessageBuilder";
import { CompanyConditionRepository } from "@/repositories/settings/CompanyConditionRepository";
import { DailyReportConfigRepository } from "@/repositories/settings/DailyReportConfigRepository";
import NotionService from "@/services/NotionService";
import PropertyUsage from "@/entities/settings/PropertyUsage";
import { PropertyUsageRepository } from "@/repositories/settings/PropertyUsageRepository";
import { BoardRepository } from "@/repositories/settings/BoardRepository";
import Board from "@/entities/settings/Board";

@Service()
export default class NotionRepository {
  private todoHistoryService: TodoHistoryService;
  private notionPageBuilder: NotionPageBuilder;

  constructor() {
    this.notionPageBuilder = Container.get(NotionPageBuilder);
    this.todoHistoryService = Container.get(TodoHistoryService);
  }

  public async syncTaskByUserBoards(
    company: Company,
    todoapp: TodoApp,
    notionClient: NotionService,
    notify: boolean = false,
  ): Promise<void> {
    const companyId = company.id;
    const todoappId = todoapp.id;
    const sections = await SectionRepository.getSections(companyId, todoappId);
    await this.getUserPageBoards(sections, company, todoapp, notionClient, notify);
  }

  private async getUserPageBoards(
    sections: Section[],
    company: Company,
    todoapp: TodoApp,
    notionClient: NotionService,
    notify: boolean = false,
  ): Promise<void> {
    try {
      const todoTasks: ITodoTask<INotionTask>[] = [];

      const processedBoardIds = new Set<string>();
      for (const section of sections) {
        if (!processedBoardIds.has(section.board_id)) {
          processedBoardIds.add(section.board_id);
          await this.getCardBoards(section.boardAdminUser, section, todoTasks, company, todoapp, sections, notionClient);
        }
      }

      const dayReminds: number[] = await CompanyConditionRepository.getDayReminds(company.companyConditions);
      await this.filterUpdatePages(todoTasks, notify);
      logger.info(`[${company.name} - ${todoapp.name}] filterUpdatePages: ${dayReminds}`);
    } catch (err) {
      logger.error(err);
    }
  }

  private async getCardBoards(
    boardAdminUser: User,
    section: Section,
    todoTasks: ITodoTask<INotionTask>[],
    company: Company,
    todoapp: TodoApp,
    sections: Section[],
    notionClient: NotionService,
  ): Promise<void> {
    if (!boardAdminUser?.todoAppUsers.length) return;
    for (const todoAppUser of boardAdminUser.todoAppUsers) {
      try {
        const [board, lastUpdatedDate]: [Board, Date] = await Promise.all([
          BoardRepository.findOneByConfig(todoapp.id, company.id),
          TodoHistoryRepository.getLastUpdatedDate(company, todoapp),
        ]);
        if (board) {
          let response = await notionClient.queryDatabase({
            database_id: board.app_board_id,
            filter: lastUpdatedDate
              ? {
                timestamp: "last_edited_time",
                last_edited_time: { on_or_after: lastUpdatedDate.toISOString().slice(0, 10) },
              }
              : undefined,
          });
          const pages = response.results;
          while (response.has_more) {
            response = await notionClient.queryDatabase({
              database_id: board.app_board_id,
              start_cursor: response.next_cursor,
            });
            pages.push(...response.results);
          }
          const pageIds: string[] = pages.map(page => page.id);
          const pageTodos: INotionTask[] = [];
          await Promise.all(pageIds.map(pageId => {
            return this.getPages(pageId, pageTodos, company, section, todoapp, board.propertyUsages, notionClient);
          }));
          await Promise.all(pageTodos.map(pageTodo => {
            return this.addTodoTask(pageTodo, todoTasks, company, todoapp, sections, todoAppUser);
          }));
        }
      } catch (err) {
        logger.error(err);
      }
    }
  }

  private getUsageProperty(propertyUsages: PropertyUsage[], pagePropertyIds: string[], usageId: number) {
    const result = propertyUsages.find(u => u.usage === usageId && pagePropertyIds.includes(u.app_property_id));
    return result?.app_property_id ?? null;
  }

  private async getPages(
    pageId: string,
    pageTodos: INotionTask[],
    company: Company,
    _section: Section,
    todoapp: TodoApp,
    propertyUsages: PropertyUsage[],
    notionClient: NotionService,
  ): Promise<void> {
    try {
      const pageInfo = await notionClient.retrievePage({ page_id: pageId }) as PageObjectResponse;
      const pageProperty = Object.keys(pageInfo.properties).map((key) => pageInfo.properties[key]) as Record<any, any>;
      if (pageProperty) {
        const pagePropertyIds = pageProperty.map((obj) => obj.id);
        const propertyId = {
          title: this.getUsageProperty(propertyUsages, pagePropertyIds, UsageType.TITLE),
          section: this.getUsageProperty(propertyUsages, pagePropertyIds, UsageType.SECTION),
          assignee: this.getUsageProperty(propertyUsages, pagePropertyIds, UsageType.ASSIGNEE),
          due: this.getUsageProperty(propertyUsages, pagePropertyIds, UsageType.DUE),
          isDone: this.getUsageProperty(propertyUsages, pagePropertyIds, UsageType.IS_DONE),
          isClosed: this.getUsageProperty(propertyUsages, pagePropertyIds, UsageType.IS_CLOSED),
        };

        const name = this.getTitle(pageProperty, propertyId.title);
        if (!name) return;

        const [isDone, isClosed, createdBy, lastEditedBy, createdAt, lastEditedAt]:
          [boolean, boolean, string, string, Date, Date] = await Promise.all([
          this.getIsStatus(pageProperty, propertyId.isDone, UsageType.IS_DONE),
          this.getIsStatus(pageProperty, propertyId.isClosed, UsageType.IS_CLOSED),
          this.getDefaultStr(pageInfo, "created_by"),
          this.getDefaultStr(pageInfo, "last_edited_by"),
          this.getDefaultDate(pageInfo, "created_time"),
          this.getDefaultDate(pageInfo, "last_edited_time"),
        ]);
        const [startDate, deadline] = this.getDeadline(pageProperty, propertyId.due);
        const pageTodo: INotionTask = {
          todoappRegId: pageId,
          name,
          sections: this.getOptionIds(pageProperty, propertyId.section),
          assignees: this.getOptionIds(pageProperty, propertyId.assignee),
          startDate,
          deadline,
          isDone: isDone,
          isClosed: isClosed,
          todoappRegUrl: this.getDefaultStr(pageInfo, "url"),
          createdBy: createdBy,
          lastEditedBy: lastEditedBy,
          createdAt: createdAt,
          lastEditedAt: lastEditedAt,
          sectionIds: [],
          createdById: null,
          lastEditedById: null,
          deadlineReminder: null,
        };

        const [sectionIds, createdById, lastEditedById]: [number[], number, number] = await Promise.all([
          SectionRepository.getSectionIds(company, todoapp, pageTodo.sections),
          this.getEditedById(company.users, todoapp.id, pageTodo.createdBy),
          this.getEditedById(company.users, todoapp.id, pageTodo.lastEditedBy),
        ]);

        pageTodo.sectionIds = sectionIds;
        pageTodo.createdById = createdById;
        pageTodo.lastEditedById = lastEditedById;

        pageTodos.push(pageTodo);
      }
    } catch(error) {
      logger.error(error);
    }
  }

  private async addTodoTask(
    pageTodo: INotionTask,
    todoTasks: ITodoTask<INotionTask>[],
    company: Company,
    todoapp: TodoApp,
    sections: Section[],
    todoAppUser: TodoAppUser,
  ): Promise<void> {
    const users = await TodoUserRepository.getUserAssignTask(company.users, pageTodo.assignees);

    const page: ITodoTask<INotionTask> = {
      todoTask: pageTodo,
      company,
      todoapp,
      todoAppUser,
      sections: sections.filter(section => pageTodo.sectionIds?.includes(section.id)),
      users,
    };

    const taskFound = todoTasks.find(task => task.todoTask?.todoappRegId === pageTodo.todoappRegId);
    if (taskFound) {
      taskFound.users = users;
    } else {
      todoTasks.push(page);
    }
  }

  private async filterUpdatePages(pageTodos: ITodoTask<INotionTask>[], notify: boolean = false): Promise<void> {
    const cards: IRemindTask<INotionTask>[] = [];

    for (const pageTodo of pageTodos) {
      let delayedCount = 0;
      let dayDurations;
      const todoTask = pageTodo.todoTask;

      if (todoTask.deadline) {
        dayDurations = diffDays(toJapanDateTime(todoTask.deadline), toJapanDateTime(new Date()));
        delayedCount = dayDurations;
      }

      cards.push({
        remindDays: dayDurations,
        cardTodo: pageTodo,
        delayedCount: delayedCount,
      });
    }
    await this.createTodo(cards, notify);
  }

  private async createTodo(taskReminds: IRemindTask<INotionTask>[], notify: boolean = false): Promise<void> {
    try {
      if (!taskReminds.length) return;
      const todos: Todo[] = [];
      const dataTodoHistories: ITodoHistory[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];
      const dataTodoSections: ITodoSectionUpdate[] = [];

      await Promise.all(taskReminds.map(taskRemind => {
        return this.addDataTodo(taskRemind, todos, dataTodoHistories, dataTodoUsers, dataTodoSections);
      }));

      const todoIds: string[] = taskReminds.map(t => t.cardTodo.todoTask.todoappRegId);
      const savedTodos = await TodoRepository.getTodoHistories(todoIds);
      await TodoRepository.upsert(todos, []);
      await Promise.all([
        this.todoHistoryService.saveTodoHistories(savedTodos, dataTodoHistories, notify),
        TodoUserRepository.saveTodoUsers(dataTodoUsers),
        TodoSectionRepository.saveTodoSections(dataTodoSections),
        // await LineMessageQueueRepository.pushTodoLineQueues(dataLineQueues),
      ]);
    } catch (error) {
      logger.error(error);
    }
  }

  private async addDataTodo(
    taskRemind: IRemindTask<INotionTask>,
    dataTodos: Todo[],
    dataTodoHistories: ITodoHistory[],
    dataTodoUsers: ITodoUserUpdate[],
    dataTodoSections: ITodoSectionUpdate[],
  ): Promise<void> {
    try {
      const cardTodo = taskRemind.cardTodo;
      const { users, todoTask, todoapp, company, sections } = cardTodo;

      users.length ? dataTodoUsers.push({ todoId: todoTask.todoappRegId, users }) : null;
      sections.length ? dataTodoSections.push({ todoId: todoTask.todoappRegId, sections }) : null;

      dataTodoHistories.push({
        todoId: todoTask.todoappRegId,
        name: todoTask.name,
        startDate: todoTask.startDate,
        deadline: todoTask.deadline,
        users: users,
        isDone: todoTask.isDone,
        isClosed: todoTask.isClosed,
        todoappRegUpdatedAt: todoTask.lastEditedAt,
        editedBy: todoTask.lastEditedById,
      });

      const todo: Todo = await TodoRepository.findOneBy({ todoapp_reg_id: todoTask.todoappRegId });
      const dataTodo = new Todo(todoTask, company, todoapp, todo);
      dataTodos.push(dataTodo);
    } catch (error) {
      logger.error(error);
    }
  }

  updateTodo = async (
    id: string,
    task: Todo,
    todoAppUser: TodoAppUser,
    notionClient: NotionService,
    correctDelayedCount: boolean = false,
  ): Promise<void> => {
    try {
      const board: Board = await BoardRepository.findOneByConfig(todoAppUser.todoapp_id, task.company_id);
      const isDoneProperty = board.propertyUsages.find(u => u.usage === UsageType.IS_DONE);
      const properties = await notionClient.getProperties(board.app_board_id);
      const propName = properties.find(p => p.id === isDoneProperty.app_property_id)?.name;
      const payload: UpdatePageParameters = {
        page_id: task.todoapp_reg_id,
        properties: {
          [propName]: { type: "checkbox", checkbox: task.is_done },
        },
      } as UpdatePageParameters;
      await notionClient.updatePage(payload);

      if (correctDelayedCount && task.delayed_count > 0) {
        task.delayed_count--;
      }

      await TodoRepository.save(task);
    } catch (error) {
      logger.error(error);
    }
  };

  public async postDailyReportByUser(
    items: IDailyReportItems,
    company: Company,
    sections: Section[],
    users: User[],
    notionClient: NotionService,
  ): Promise<INotionDailyReport[]> {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const configRecord = await DailyReportConfigRepository.findOneBy({ company_id: company.id });
      const response: CreatePageResponse[] = await Promise.all(users.map(async (user) => {
        const itemsByUser = SlackMessageBuilder.filterTodosByUser(items, sections, user);
        const docToolUsers = user.documentToolUsers.find(
          (du) => du.documentTool.tool_code === DocumentToolCode.NOTION
        );
        const pageOption = await this.notionPageBuilder.createDailyReportByUser(
          configRecord.database,
          docToolUsers,
          itemsByUser,
          today,
          notionClient,
        );
        return notionClient.createPage(pageOption);
      }));
      return response.map((page) => {
        const properties = page["properties"];
        const url = page["url"];
        for (const key in properties) {
          const prop = properties[key];
          if (prop.type === "people") {
            const peopleProps = prop.people.filter(person => person.id);
            return peopleProps.map(prop => ({
              pageId: page.id,
              docAppRegUrl: url,
              assignee: prop.id,
            }));
          }
        }
      });
    } catch (error) {
      logger.error(error);
    }
  }

  private getTitle(
    pageProperty: Record<PropertyKey, any>,
    titleId: string,
  ): string {
    try {
      const property = pageProperty.find(prop => prop.id === titleId);
      return property.title.map(t => t.plain_text ?? "").join("");
    } catch (err) {
      logger.error(err);
      return;
    }
  }

  private getDeadline(pageProperty: Record<PropertyKey, any>, dueId: string): [Date, Date] {
    try {
      const property = pageProperty.find(prop => prop.id === dueId);
      switch (property.type) {
        case "date":
          if (property.date) {
            const date = property.date;
            return [new Date(date.start), new Date(date.end ? date.end : date.start)];
          }
          break;
        case "formula":
          if (property.formula.type === "date" && property.formula.date) {
            const date = property.formula.date;
            return [new Date(date.start), new Date(date.end ? date.end : date.start)];
          }
          break;
        default:
          break;
      }
    } catch (err) {
      logger.error(err);
      return;
    }
  }

  private getOptionIds(
    pageProperty: Record<PropertyKey, any>,
    sectionId: string,
  ): string[] {
    try {
      const property = pageProperty.find(prop => prop.id === sectionId);
      switch (property?.type) {
        case "relation":
          return property.relation.map(relation => relation.id);
        case "select":
          return [property.select?.id];
        case "multi_select":
          return property.multi_select.map(select => select.id);
        case "people":
          return property.people.map(person => person.id);
        default:
          return null;
      }
    } catch (err) {
      logger.error(err);
    }
  }

  private async getIsStatus(
    pageProperty: Record<PropertyKey, any>,
    propId: string,
    usageId: ValueOf<typeof UsageType>,
  ): Promise<boolean> {
    try {
      const property = pageProperty.find(prop => prop.id === propId);
      let propertyUsage: PropertyUsage;
      switch (property.type) {
        case "checkbox":
          return property.checkbox;
        case "formula":
          return property.formula.type === "boolean" ? property.formula.boolean : null;
        case "status":
          propertyUsage = await PropertyUsageRepository.findOneBy({ app_property_id: propId, usage: usageId }); // TODO: CompanyやSectionでも絞っておきたい
          return propertyUsage?.app_options.includes(property.status?.id) ?? false;
        case "select":
          propertyUsage = await PropertyUsageRepository.findOneBy({ app_property_id: propId, usage: usageId }); // TODO: CompanyやSectionでも絞っておきたい
          return propertyUsage?.app_options.includes(property.select?.id) ?? false;
        default:
          break;
      }
    } catch (err) {
      logger.error(err);
    }
  }

  private async getEditedById(
    usersCompany: User[],
    todoappId: number,
    editedBy: string,
  ): Promise<number> {
    const filteredUsers = usersCompany.filter(user => user.todoAppUsers.some(todoAppUser =>
      todoAppUser.todoapp_id === todoappId && todoAppUser.user_app_id === editedBy,
    ));

    return filteredUsers.length ? filteredUsers[0].id : undefined;
  }

  private getDefaultStr(
    pageInfo: PageObjectResponse,
    type: string,
  ): string {
    try {
      switch (type) {
        case "last_edited_by":
          return pageInfo.last_edited_by.id;
        case "created_by":
          return pageInfo.created_by.id;
        case "url":
          return pageInfo.url;
      }
    } catch (err) {
      logger.error(err);
    }
  }

  private getDefaultDate(
    pageInfo: PageObjectResponse,
    propName: string,
  ): Date {
    try {
      const dateStr = pageInfo[propName];
      return new Date(dateStr);
    } catch (err) {
      logger.error(err);
    }
  }
}