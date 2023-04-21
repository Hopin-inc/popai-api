import {
  PageObjectResponse,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { Container, Service } from "typedi";

import Todo from "@/entities/transactions/Todo";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import Company from "@/entities/settings/Company";
import User from "@/entities/settings/User";

import TodoHistoryService from "@/services/TodoHistoryService";

import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import { TodoHistoryRepository } from "@/repositories/transactions/TodoHistoryRepository";
import { TodoUserRepository } from "@/repositories/transactions/TodoUserRepository";

import logger from "@/libs/logger";
import {
  IRemindTask,
  ITodoHistory,
  ITodoTask,
  ITodoUserUpdate,
} from "@/types";
import { INotionPropertyInfo, INotionTask } from "@/types/notion";
import { TodoAppId, UsageType } from "@/consts/common";
import NotionClient from "@/integrations/NotionClient";
import PropertyUsage from "@/entities/settings/PropertyUsage";
import { BoardRepository } from "@/repositories/settings/BoardRepository";
import Board from "@/entities/settings/Board";
import { TaskServiceParallels } from "@/consts/parallels";
import { runInParallel } from "@/utils/process";

const TODO_APP_ID = TodoAppId.NOTION;

@Service()
export default class NotionRepository {
  private todoHistoryService: TodoHistoryService;

  constructor() {
    this.todoHistoryService = Container.get(TodoHistoryService);
  }

  public async syncTaskByUserBoards(
    company: Company,
  ): Promise<void> {
    try {
      const todoTasks: ITodoTask<INotionTask>[] = [];
      await this.getCardBoards(todoTasks, company);
      await this.filterUpdatePages(todoTasks, company);
    } catch (error) {
      logger.error(error);
    }
  }

  private async getCardBoards(
    todoTasks: ITodoTask<INotionTask>[],
    company: Company,
  ): Promise<void> {
    try {
      const [notionClient, board, lastUpdatedDate] = await Promise.all([
        NotionClient.init(company.id),
        BoardRepository.findOneByConfig(TODO_APP_ID, company.id),
        TodoHistoryRepository.getLastUpdatedDate(company, TODO_APP_ID),
      ]);
      if (board) {
        let hasMore: boolean = true;
        let startCursor: string | undefined = undefined;
        while (hasMore) {
          const response = await notionClient.queryDatabase({
            database_id: board.appBoardId,
            filter: lastUpdatedDate
              ? {
                timestamp: "last_edited_time",
                last_edited_time: { on_or_after: lastUpdatedDate.toISOString().slice(0, 10) },
              }
              : undefined,
            start_cursor: startCursor,
          });
          hasMore = response?.has_more;
          startCursor = response?.next_cursor;
          const pageIds: string[] = response?.results.map(page => page.id);
          const pageTodos: INotionTask[] = [];
          await runInParallel(
            pageIds,
            async (pageId) => {
              await this.getPages(pageId, pageTodos, company, board.propertyUsages, notionClient);
            },
            TaskServiceParallels.GET_PAGES,
          );
          await runInParallel(
            pageTodos,
            async (pageTodo) => {
              await this.addTodoTask(pageTodo, todoTasks, company);
            },
            TaskServiceParallels.GET_PAGES,
          );
        }
      }
    } catch (error) {
      logger.error(error);
    }
  }

  private getUsageProperty(propertyUsages: PropertyUsage[], pagePropertyIds: string[], usageId: number) {
    return propertyUsages.find(u => u.usage === usageId && pagePropertyIds.includes(u.appPropertyId));
  }

  private async getPages(
    pageId: string,
    pageTodos: INotionTask[],
    company: Company,
    propertyUsages: PropertyUsage[],
    notionClient: NotionClient,
  ): Promise<void> {
    try {
      const pageInfo = await notionClient.retrievePage({ page_id: pageId }) as PageObjectResponse;
      if (pageInfo?.properties) {
        const pageProperties = Object.keys(pageInfo.properties)
          .map(key => pageInfo.properties[key]) as INotionPropertyInfo[];
        if (pageProperties.length) {
          const pagePropertyIds = pageProperties.map((obj) => obj.id);
          const properties = {
            title: this.getUsageProperty(propertyUsages, pagePropertyIds, UsageType.TITLE),
            section: this.getUsageProperty(propertyUsages, pagePropertyIds, UsageType.SECTION),
            assignee: this.getUsageProperty(propertyUsages, pagePropertyIds, UsageType.ASSIGNEE),
            deadline: this.getUsageProperty(propertyUsages, pagePropertyIds, UsageType.DEADLINE),
            isDone: this.getUsageProperty(propertyUsages, pagePropertyIds, UsageType.IS_DONE),
            isClosed: this.getUsageProperty(propertyUsages, pagePropertyIds, UsageType.IS_CLOSED),
          };
          const name = this.getTitle(pageProperties, properties.title);
          if (!name) return;
          const [startDate, deadline] = this.getDeadline(pageProperties, properties.deadline);
          const pageTodo: INotionTask = {
            todoAppRegId: pageId,
            name,
            assignees: this.getOptionIds(pageProperties, properties.assignee),
            startDate,
            deadline,
            isDone: this.getIsStatus(pageProperties, properties.isDone),
            isClosed: this.getIsStatus(pageProperties, properties.isClosed),
            todoAppRegUrl: this.getDefaultStr(pageInfo, "url"),
            createdBy: this.getDefaultStr(pageInfo, "created_by"),
            lastEditedBy: this.getDefaultStr(pageInfo, "last_edited_by"),
            createdAt: this.getDefaultDate(pageInfo, "created_time"),
            lastEditedAt: this.getDefaultDate(pageInfo, "last_edited_time"),
            sectionIds: [],
            createdById: null,
            lastEditedById: null,
            deadlineReminder: null,
          };
          const [createdById, lastEditedById]: [string, string] = await Promise.all([
            this.getEditedById(company.users, TODO_APP_ID, pageTodo.createdBy),
            this.getEditedById(company.users, TODO_APP_ID, pageTodo.lastEditedBy),
          ]);
          pageTodo.createdById = createdById;
          pageTodo.lastEditedById = lastEditedById;
          pageTodos.push(pageTodo);
        }
      }
    } catch(error) {
      logger.error(error);
    }
  }

  private async addTodoTask(
    pageTodo: INotionTask,
    todoTasks: ITodoTask<INotionTask>[],
    company: Company,
  ): Promise<void> {
    const users = await TodoUserRepository.getUserAssignTask(company.users, pageTodo.assignees);
    const page: ITodoTask<INotionTask> = {
      todoTask: pageTodo,
      company,
      users,
    };

    const taskFound = todoTasks.find(task => {
      return task.todoTask?.todoAppRegId === pageTodo.todoAppRegId && task.company.id === company.id;
    });
    if (taskFound) {
      taskFound.users = users;
    } else {
      todoTasks.push(page);
    }
  }

  private async filterUpdatePages(
    pageTodos: ITodoTask<INotionTask>[],
    company: Company,
  ): Promise<void> {
    const cards: IRemindTask<INotionTask>[] = [];
    for (const pageTodo of pageTodos) {
      cards.push({
        cardTodo: pageTodo,
      });
    }
    await this.createTodo(cards, company);
  }

  private async createTodo(
    taskReminds: IRemindTask<INotionTask>[],
    company: Company,
  ): Promise<void> {
    try {
      if (!taskReminds.length) return;
      const todos: Todo[] = [];
      const dataTodoHistories: ITodoHistory[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];
      await Promise.all(taskReminds.map(taskRemind => {
        return this.addDataTodo(taskRemind, todos, dataTodoHistories, dataTodoUsers);
      }));

      const todoIds: string[] = taskReminds.map(t => t.cardTodo.todoTask.todoAppRegId);
      const savedTodos = await TodoRepository.getTodoHistories(todoIds, company.id);
      await TodoRepository.upsert(todos, []);
      await Promise.all([
        this.todoHistoryService.save(savedTodos, dataTodoHistories),
        TodoUserRepository.saveTodoUsers(dataTodoUsers),
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
  ): Promise<void> {
    try {
      const cardTodo = taskRemind.cardTodo;
      const { users, todoTask, company } = cardTodo;

      users.length ? dataTodoUsers.push({ todoId: todoTask.todoAppRegId, users }) : null;

      dataTodoHistories.push({
        todoId: todoTask.todoAppRegId,
        companyId: company.id,
        name: todoTask.name,
        startDate: todoTask.startDate,
        deadline: todoTask.deadline,
        users: users,
        isDone: todoTask.isDone,
        isClosed: todoTask.isClosed,
        todoAppRegUpdatedAt: todoTask.lastEditedAt,
      });

      const todo: Todo = await TodoRepository.findOneBy({ appTodoId: todoTask.todoAppRegId });
      const dataTodo = new Todo(todoTask, company, TODO_APP_ID, todo);
      dataTodos.push(dataTodo);
    } catch (error) {
      logger.error(error);
    }
  }

  updateTodo = async (
    id: string,
    task: Todo,
    todoAppUser: TodoAppUser,
    notionClient: NotionClient,
  ): Promise<void> => {
    try {
      const board: Board = await BoardRepository.findOneByConfig(todoAppUser.todoAppId, task.companyId);
      const isDoneProperty = board.propertyUsages.find(u => u.usage === UsageType.IS_DONE);
      const properties = await notionClient.getProperties(board.appBoardId);
      const propName = properties.find(p => p.id === isDoneProperty.appPropertyId)?.name;
      const payload: UpdatePageParameters = {
        page_id: task.appTodoId,
        properties: {
          [propName]: { type: "checkbox", checkbox: task.isDone },
        },
      } as UpdatePageParameters;
      await notionClient.updatePage(payload);
      await TodoRepository.save(task);
    } catch (error) {
      logger.error(error);
    }
  };

  private getTitle(
    pageProperties: INotionPropertyInfo[],
    propertyUsage: PropertyUsage,
  ): string {
    try {
      const property = pageProperties.find(prop => prop.id === propertyUsage.appPropertyId);
      if (property.type === "title") {
        return property.title.map(t => t.plain_text ?? "").join("");
      }
    } catch (error) {
      logger.error(error);
      return;
    }
  }

  private getDeadline(
    pageProperties: INotionPropertyInfo[],
    propertyUsage: PropertyUsage,
  ): [Date | null, Date | null] {
    try {
      const property = pageProperties.find(prop => prop.id === propertyUsage.appPropertyId);
       switch (property?.type) {
        case "date":
          if (property.date) {
            const date = property.date;
            return date?.start
              ? [new Date(date.start) ?? null, new Date(date.end ? date.end : date.start)]
              : [null, null];
          }
          break;
        case "formula":
          if (property.formula.type === "date" && property.formula.date) {
            const date = property.formula.date;
            return date?.start
              ? [new Date(date.start) ?? null, new Date(date.end ? date.end : date.start)]
              : [null, null];
          }
          break;
        default:
          return [null, null];
      }
    } catch (error) {
      logger.error(error);
      return [null, null];
    }
  }

  private getOptionIds(
    pageProperty: Record<PropertyKey, any>,
    propertyUsage: PropertyUsage,
  ): string[] {
    try {
      const property = pageProperty.find(prop => prop.id === propertyUsage.appPropertyId);
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
    } catch (error) {
      logger.error(error);
    }
  }

  private getIsStatus(
    pageProperty: Record<PropertyKey, any>,
    propertyUsage: PropertyUsage,
  ): boolean {
    try {
      const property = pageProperty.find(prop => prop.id === propertyUsage.appPropertyId);
      switch (property.type) {
        case "checkbox":
          return property.checkbox;
        case "formula":
          return property.formula.type === "boolean" ? property.formula.boolean : null;
        case "status":
          return propertyUsage.appOptions.includes(property.status?.id) ?? false;
        case "select":
          return propertyUsage.appOptions.includes(property.select?.id) ?? false;
        default:
          break;
      }
    } catch (error) {
      logger.error(error);
    }
  }

  private async getEditedById(
    usersCompany: User[],
    todoAppId: number,
    editedBy: string,
  ): Promise<string> {
    const filteredUsers = usersCompany.filter(user => {
      return user.todoAppUser.todoAppId === todoAppId && user.todoAppUser.appUserId === editedBy;
    });
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
    } catch (error) {
      logger.error(error);
    }
  }

  private getDefaultDate(
    pageInfo: PageObjectResponse,
    propName: string,
  ): Date {
    try {
      const dateStr = pageInfo[propName];
      return new Date(dateStr);
    } catch (error) {
      logger.error(error);
    }
  }
}
