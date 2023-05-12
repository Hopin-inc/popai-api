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
import { TodoAppId, UsageType } from "@/consts/common";
import NotionClient from "@/integrations/NotionClient";
import PropertyUsage from "@/entities/settings/PropertyUsage";
import Board from "@/entities/settings/Board";
import { ParallelChunkUnit } from "@/consts/parallels";
import { runInOrder } from "@/utils/process";
import { diffDays, formatDatetime, toJapanDateTime } from "@/utils/datetime";
import { getUsageProperty, setHistoriesForExistingTodo, setHistoriesForNewTodo } from "@/utils/misc";

const TODO_APP_ID = TodoAppId.NOTION;

@Service()
export default class NotionRepository {
  private notionClient: NotionClient;

  public async syncTodos(company: Company): Promise<void> {
    try {
      this.notionClient = await NotionClient.init(company.id);
      const [notionClient, board, lastUpdatedDate] = await Promise.all([
        NotionClient.init(company.id),
        BoardRepository.findOneByConfig(company.id),
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
              try {
                const todos: Todo[] = [];
                const todoUserUpdates: ITodoUserUpdate[] = [];
                const historyOptions: ITodoHistoryOption[] = [];
                await Promise.all(pageIdsChunk.map(async pageId => {
                  try {
                    const {
                      todo,
                      users,
                      currentUserIds,
                      args,
                    } = await this.generateTodoFromApi(pageId, company, board.propertyUsages) ?? {};
                    let todoId: string;
                    if (todo?.id) {
                      todos.push(todo);
                      todoId = todo.id;
                    } else {
                      const savedTodo = await TodoRepository.save(todo);
                      todoId = savedTodo.id;
                    }
                    todoUserUpdates.push({ todoId, users, currentUserIds });
                    historyOptions.push(...args.map(a => ({ ...a, todoId })));
                  } catch (error) {
                    logger.error(error);
                  }
                }));
                await TodoRepository.upsert(todos, []);
                await Promise.all([
                  TodoHistoryRepository.saveHistories(historyOptions),
                  TodoUserRepository.saveTodoUsers(todoUserUpdates),
                ]);
              } catch (error) {
                logger.error(error);
              }
            },
            ParallelChunkUnit.GENERATE_TODO,
          );
        }
      }
    } catch (error) {
      logger.error(error);
    }
  }

  private async generateTodoFromApi(
    pageId: string,
    company: Company,
    propertyUsages: PropertyUsage[],
  ): Promise<{ todo: Todo, users: User[], currentUserIds: string[], args: Omit<ITodoHistoryOption, "todoId">[] }> {
    const nullResponse = { todo: null, users: [], currentUserIds: [], args: [] };
    try {
      const pageInfo = await this.notionClient.retrievePage({ page_id: pageId }) as PageObjectResponse;
      if (!pageInfo?.properties) {
        return nullResponse;
      }
      const pageProperties = Object.keys(pageInfo.properties)
        .map(key => pageInfo.properties[key]) as INotionPropertyInfo[];
      if (!pageProperties.length) {
        return nullResponse;
      }

      let args: Omit<ITodoHistoryOption, "todoId">[] = [];
      const pagePropertyIds = pageProperties.map((obj) => obj.id);
      const properties = this.getProperties(propertyUsages, pagePropertyIds);
      const name = this.getTitle(pageProperties, properties.title);
      if (!name) {
        return nullResponse;
      }
      const [startDate, deadline] = this.getDeadline(pageProperties, properties.deadline);
      let todo = await TodoRepository.findOne({
        where: { companyId: company.id, appTodoId: pageId },
        relations: ["todoUsers.user"],
      });
      const currentUserIds = todo?.users ? todo.users.map(u => u?.id).filter(id => id) : [];
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
      const isDelayed = deadline
        ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date())) > 0
        : null;

      if (todo) {
        args = await setHistoriesForExistingTodo(todo, users, startDate, deadline, isDone, isClosed, isDelayed);
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
        args = setHistoriesForNewTodo(users, startDate, deadline, isDone, isClosed, isDelayed);
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
      return { todo, users, currentUserIds, args };
    } catch(error) {
      logger.error(error);
      return nullResponse;
    }
  }

  private getProperties(usages: PropertyUsage[], propertyIds: string[]) {
    return {
      title: getUsageProperty(usages, propertyIds, UsageType.TITLE),
      section: getUsageProperty(usages, propertyIds, UsageType.SECTION),
      assignee: getUsageProperty(usages, propertyIds, UsageType.ASSIGNEE),
      deadline: getUsageProperty(usages, propertyIds, UsageType.DEADLINE),
      isDone: getUsageProperty(usages, propertyIds, UsageType.IS_DONE),
      isClosed: getUsageProperty(usages, propertyIds, UsageType.IS_CLOSED),
    };
  }

  public async updateTodo(
    id: string,
    task: Todo,
    todoAppUser: TodoAppUser,
    notionClient: NotionClient,
  ): Promise<void> {
    try {
      const board: Board = await BoardRepository.findOneByConfig(task.companyId);
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
              ? [new Date(date.start), new Date(date.end ? date.end : date.start)]
              : [null, null];
          } else {
            return [null, null];
          }
        case "formula":
          if (property.formula.type === "date" && property.formula.date) {
            const date = property.formula.date;
            return date?.start
              ? [new Date(date.start), new Date(date.end ? date.end : date.start)]
              : [null, null];
          } else {
            return [null, null];
          }
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
