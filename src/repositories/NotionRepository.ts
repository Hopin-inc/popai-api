import {
  PageObjectResponse,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { Service } from "typedi";

import Todo from "@/entities/transactions/Todo";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import Company from "@/entities/settings/Company";
import User from "@/entities/settings/User";

import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import { TodoHistoryRepository } from "@/repositories/transactions/TodoHistoryRepository";
import { TodoUserRepository } from "@/repositories/transactions/TodoUserRepository";
import { BoardRepository } from "@/repositories/settings/BoardRepository";

import logger from "@/libs/logger";
import { ITodoHistoryOption, ITodoUserUpdate } from "@/types";
import { INotionPropertyInfo } from "@/types/notion";
import { TodoAppId, TodoHistoryAction as Action, TodoHistoryProperty as Property, UsageType } from "@/consts/common";
import NotionClient from "@/integrations/NotionClient";
import PropertyUsage from "@/entities/settings/PropertyUsage";
import Board from "@/entities/settings/Board";
import { ParallelChunkUnit } from "@/consts/parallels";
import { runInOrder } from "@/utils/process";
import { diffDays, formatDatetime, toJapanDateTime } from "@/utils/datetime";
import { extractDifferences } from "@/utils/array";

const TODO_APP_ID = TodoAppId.NOTION;

@Service()
export default class NotionRepository {
  private notionClient: NotionClient;

  public async syncTodos(
    company: Company,
  ): Promise<void> {
    try {
      this.notionClient = await NotionClient.init(company.id);
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
                last_edited_time: { on_or_after: formatDatetime(lastUpdatedDate, "YYYY-MM-DD") },
              }
              : undefined,
            start_cursor: startCursor,
          });
          hasMore = response?.has_more;
          startCursor = response?.next_cursor;
          const pageIds: string[] = response?.results.map(page => page.id);
          await runInOrder(
            pageIds,
            async pageIdsChunk => {
              const todos: Todo[] = [];
              const todoUserUpdates: ITodoUserUpdate[] = [];
              const historyOptions: ITodoHistoryOption[] = [];
              await Promise.all(pageIdsChunk.map(async pageId => {
                const { todo, users, args } = await this.generateTodoFromApi(pageId, company, board.propertyUsages);
                todos.push(todo);
                todoUserUpdates.push({ todoId: todo.id, users });
                historyOptions.push(...args.map(a => ({ ...a, todoId: todo.id })));
              }));
              await TodoRepository.upsert(todos, []);
              await Promise.all([
                TodoHistoryRepository.saveHistories(historyOptions),
                TodoUserRepository.saveTodoUsers(todoUserUpdates),
              ]);
            },
            ParallelChunkUnit.GENERATE_TODO,
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

  private async generateTodoFromApi(
    pageId: string,
    company: Company,
    propertyUsages: PropertyUsage[],
  ): Promise<{ todo: Todo, users: User[], args: Omit<ITodoHistoryOption, "todoId">[] }> {
    try {
      const nullResponse = { todo: null, users: [], args: [] };
      const pageInfo = await this.notionClient.retrievePage({ page_id: pageId }) as PageObjectResponse;
      if (!pageInfo?.properties) {
        return nullResponse;
      }
      const pageProperties = Object.keys(pageInfo.properties)
        .map(key => pageInfo.properties[key]) as INotionPropertyInfo[];
      if (!pageProperties.length) {
        return nullResponse;
      }

      const args: Omit<ITodoHistoryOption, "todoId">[] = [];
      const pagePropertyIds = pageProperties.map((obj) => obj.id);
      const properties = this.getProperties(propertyUsages, pagePropertyIds);
      const name = this.getTitle(pageProperties, properties.title);
      if (!name) return;
      const [startDate, deadline] = this.getDeadline(pageProperties, properties.deadline);
      let todo = await TodoRepository.findOne({
        where: { companyId: company.id, appTodoId: pageId },
        relations: ["todoUsers.user"],
      });
      const appUrl = this.getDefaultStr(pageInfo, "url");
      const appCreatedAt = this.getDefaultDate(pageInfo, "created_time");
      const createdBy = this.getEditedById(
        company.users,
        TODO_APP_ID,
        this.getDefaultStr(pageInfo, "created_by"),
      );
      const isDone = this.getIsStatus(pageProperties, properties.isDone);
      const isClosed = this.getIsStatus(pageProperties, properties.isClosed);
      const appUserIds = this.getOptionIds(pageProperties, properties.assignee);
      const users = appUserIds.map(appUserId => {
        return company.users?.find(u => u.todoAppUser?.appUserId === appUserId);
      }).filter(u => u);
      const isDelayed = todo.deadline
        ? diffDays(toJapanDateTime(todo.deadline), toJapanDateTime(new Date())) > 0
        : null;

      if (todo) {
        await this.setHistoriesForExistingTodo(args, todo, users, startDate, deadline, isDone, isClosed, isDelayed);
        Object.assign(todo, {
          ...todo,
          name,
          appUrl,
          appCreatedAt,
          createdBy,
          startDate,
          deadline,
          isDone,
          isClosed,
        });
      } else {
        await this.setHistoriesForNewTodo(args, users, startDate, deadline, isDone, isClosed, isDelayed);
        todo = new Todo({
          name,
          todoAppId: TODO_APP_ID,
          company,
          appTodoId: pageId,
          appUrl,
          appCreatedAt,
          createdBy,
          startDate,
          deadline,
          isDone,
          isClosed,
        });
      }
      return { todo, users, args };
    } catch(error) {
      logger.error(error);
    }
  }

  private getProperties(usages: PropertyUsage[], propertyIds: string[]) {
    return {
      title: this.getUsageProperty(usages, propertyIds, UsageType.TITLE),
      section: this.getUsageProperty(usages, propertyIds, UsageType.SECTION),
      assignee: this.getUsageProperty(usages, propertyIds, UsageType.ASSIGNEE),
      deadline: this.getUsageProperty(usages, propertyIds, UsageType.DEADLINE),
      isDone: this.getUsageProperty(usages, propertyIds, UsageType.IS_DONE),
      isClosed: this.getUsageProperty(usages, propertyIds, UsageType.IS_CLOSED),
    };
  }

  private async setHistoriesForExistingTodo(
    args: Omit<ITodoHistoryOption, "todoId">[],
    todo: Todo,
    users: User[],
    startDate: Date,
    deadline: Date,
    isDone: boolean,
    isClosed: boolean,
    isDelayed: boolean,
  ) {
    const [latestDelayedHistory, latestRecoveredHistory] = await Promise.all([
      TodoHistoryRepository.getLatestDelayedHistory(todo),
      TodoHistoryRepository.getLatestRecoveredHistory(todo),
    ]);
    const daysDiff = todo.deadline && deadline
      ? diffDays(toJapanDateTime(todo.deadline), toJapanDateTime(deadline))
      : null;
    if ((todo.deadline || deadline) && daysDiff !== 0) {  // On deadline changed
      args.push({
        property: Property.DEADLINE,
        action: !todo.deadline ? Action.CREATE : !deadline ? Action.DELETE : Action.MODIFIED,
        info: { startDate, deadline, daysDiff },
      });
      if (latestRecoveredHistory && latestRecoveredHistory.action === Action.CREATE) {
        args.push({
          property: Property.IS_RECOVERED,
          action: Action.DELETE,
        });
      }
    }
    const [deletedAssignees, addedAssignees] = extractDifferences(todo.users, users, "id");
    if (addedAssignees.length) {
      args.push({
        property: Property.ASSIGNEE,
        action: Action.CREATE,
        info: { userIds: addedAssignees.map(u => u.id) },
      });
    }
    if (deletedAssignees.length) {
      args.push({
        property: Property.ASSIGNEE,
        action: Action.CREATE,
        info: { userIds: deletedAssignees.map(u => u.id) },
      });
    }
    if (todo.isDone !== isDone) { // On marked as done
      args.push({
        property: Property.IS_DONE,
        action: isDone ? Action.CREATE : Action.DELETE,
      });
    }
    if (todo.isClosed !== isClosed) { // On marked as closed
      args.push({
        property: Property.IS_CLOSED,
        action: isClosed ? Action.CREATE : Action.DELETE,
      });
    }
    if (isDelayed) {  // When ddl is before today
      if (!isDone && latestDelayedHistory && latestDelayedHistory.action !== Action.CREATE) {
        args.push({
          property: Property.IS_DELAYED,
          action: Action.CREATE,
        });
      }
    } else {  // When ddl is exactly or after today
      if (latestDelayedHistory && latestDelayedHistory.action !== Action.DELETE) {
        args.push({
          property: Property.IS_DELAYED,
          action: Action.DELETE,
        });
      }
      if (latestRecoveredHistory && latestRecoveredHistory.action !== Action.DELETE) {
        args.push({
          property: Property.IS_RECOVERED,
          action: Action.DELETE,
        });
      }
    }
  }

  private async setHistoriesForNewTodo(
    args: Omit<ITodoHistoryOption, "todoId">[],
    users: User[],
    startDate: Date,
    deadline: Date,
    isDone: boolean,
    isClosed: boolean,
    isDelayed: boolean,
  ) {
    args.push({
      property: Property.NAME,
      action: Action.CREATE,
    });
    if (users.length) {
      args.push({
        property: Property.ASSIGNEE,
        action: Action.CREATE,
        info: { userIds: users.map(u => u.id) },
      });
    }
    if (deadline) {
      args.push({
        property: Property.DEADLINE,
        action: Action.CREATE,
        info: { startDate, deadline },
      });
      if (isDelayed && !isDone && !isClosed) {
        args.push({
          property: Property.IS_DELAYED,
          action: Action.CREATE,
        });
      }
    }
    if (isDone) {
      args.push({
        property: Property.IS_DONE,
        action: Action.CREATE,
      });
    }
    if (isClosed) {
      args.push({
        property: Property.IS_CLOSED,
        action: Action.CREATE,
      });
    }
  }

  public async updateTodo(
    id: string,
    task: Todo,
    todoAppUser: TodoAppUser,
    notionClient: NotionClient,
  ): Promise<void> {
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
  }

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
              ? [date.start ? new Date(date.start) : null, new Date(date.end ? date.end : date.start)]
              : [null, null];
          }
          break;
        case "formula":
          if (property.formula.type === "date" && property.formula.date) {
            const date = property.formula.date;
            return date?.start
              ? [date.start ? new Date(date.start) : null, new Date(date.end ? date.end : date.start)]
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
          return [];
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

  private getEditedById(
    usersCompany: User[],
    todoAppId: number,
    editedBy: string,
  ): string {
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
