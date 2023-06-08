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
import {
  IProjectHistoryOption,
  IProjectUserUpdate,
  ITodoHistoryOption,
  ITodoProjectUpdate,
  ITodoUserUpdate,
} from "@/types";
import { INotionPropertyInfo } from "@/types/notion";
import { HistoryAction, ProjectRule, TodoAppId, TodoHistoryProperty, UsageType } from "@/consts/common";
import NotionClient from "@/integrations/NotionClient";
import PropertyUsage from "@/entities/settings/PropertyUsage";
import Board from "@/entities/settings/Board";
import { ParallelChunkUnit } from "@/consts/parallels";
import { runInOrder } from "@/utils/process";
import { diffDays, formatDatetime, toJapanDateTime } from "@/utils/datetime";
import {
  getUsageProperty,
  setHistoriesForExistingProject,
  setHistoriesForExistingTodo,
  setHistoriesForNewProject,
  setHistoriesForNewTodo,
} from "@/utils/misc";
import Project from "@/entities/transactions/Project";
import { TodoProjectRepository } from "@/repositories/transactions/TodoProjectRepository";
import { ProjectRepository } from "@/repositories/transactions/ProjectRepository";
import { ProjectUserRepository } from "@/repositories/transactions/ProjectUserRepository";
import { ProjectHistoryRepository } from "@/repositories/transactions/ProjectHistoryRepository";

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
      this.notionClient = notionClient;
      if (board) {
        await this.syncTodosByType(company, board, lastUpdatedDate, "project");
        await this.syncTodosByType(company, board, lastUpdatedDate, "todo");
      }
    } catch (error) {
      logger.error(error.message, error);
    }
  }

  private async syncTodosByType(
    company: Company,
    board: Board,
    lastUpdatedDate: Date,
    generateType?: Awaited<ReturnType<typeof this.generateTodoFromApi>>["type"],
  ) {
    let hasMore: boolean = true;
    let startCursor: string | undefined = undefined;
    while (hasMore) {
      const response = await this.notionClient.queryDatabase({
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
        async pageIdsChunk => this.syncTodosByPageIdsAndType(pageIdsChunk, company, board, generateType),
        ParallelChunkUnit.GENERATE_TODO,
      );
    }
  }

  private async syncTodosByPageIdsAndType(
    pageIds: string[],
    company: Company,
    board: Board,
    generateType?: Awaited<ReturnType<typeof this.generateTodoFromApi>>["type"],
  ) {
    try {
      const projects: Project[] = [];
      const todos: Todo[] = [];
      const projectUserUpdates: IProjectUserUpdate[] = [];
      const projectHistoryOptions: IProjectHistoryOption[] = [];
      const todoUserUpdates: ITodoUserUpdate[] = [];
      const todoProjectUpdates: ITodoProjectUpdate[] = [];
      const todoHistoryOptions: ITodoHistoryOption[] = [];
      await Promise.all(pageIds.map(async pageId => {
        try {
          const projectOrTodoInfo = await this.generateTodoFromApi(pageId, company, board);
          if (!projectOrTodoInfo) {
            return;
          } else if (
            projectOrTodoInfo.type === "project"
            && (!generateType || generateType === "project")
          ) {
            const {
              project,
              users,
              currentUserIds,
              args,
            } = projectOrTodoInfo;
            let projectId: string;
            if (project?.id) {
              projects.push(project);
              projectId = project.id;
            } else {
              const savedProject = await ProjectRepository.save(project);
              projectId = savedProject.id;
            }
            projectUserUpdates.push({ projectId, users, currentUserIds });
            projectHistoryOptions.push(...args.map(a => ({ ...a, id: projectId })));
          } else if (
            projectOrTodoInfo.type === "todo"
            && (!generateType || generateType === "todo")
          ) {
            const {
              todo,
              projects,
              currentProjectIds,
              users,
              currentUserIds,
              args,
            } = projectOrTodoInfo;
            let todoId: string;
            if (todo?.id) {
              todos.push(todo);
              todoId = todo.id;
            } else {
              const savedTodo = await TodoRepository.save(todo);
              todoId = savedTodo.id;
            }
            todoUserUpdates.push({ todoId, users, currentUserIds });
            todoProjectUpdates.push({ todoId, projects, currentProjectIds });
            todoHistoryOptions.push(...args.map(a => ({ ...a, id: todoId })));
          }
        } catch (error) {
          logger.error(error.message, error);
        }
      }));
      await ProjectRepository.upsert(projects, []);
      await TodoRepository.upsert(todos, []);
      await Promise.all([
        ProjectUserRepository.saveProjectUsers(projectUserUpdates),
        ProjectHistoryRepository.saveHistories(projectHistoryOptions),
        TodoUserRepository.saveTodoUsers(todoUserUpdates),
        TodoProjectRepository.saveTodoProjects(todoProjectUpdates),
        TodoHistoryRepository.saveHistories(todoHistoryOptions),
      ]);
    } catch (error) {
      logger.error(error.message, error);
    }
  }

  private async generateTodoFromApi(
    pageId: string,
    company: Company,
    board: Board,
  ): Promise<{
    type: "todo",
    todo: Todo,
    projects: Project[],
    currentProjectIds: string[],
    users: User[],
    currentUserIds: string[],
    args: Omit<ITodoHistoryOption, "id">[],
  } | {
    type: "project",
    project: Project,
    users: User[],
    currentUserIds: string[],
    args: Omit<IProjectHistoryOption, "id">[],
  } | null> {
    const propertyUsages = board.propertyUsages;
    try {
      const pageInfo = await this.notionClient.retrievePage({ page_id: pageId }) as PageObjectResponse;
      if (!pageInfo?.properties) {
        return null;
      }
      const pageProperties = Object.keys(pageInfo.properties)
        .map(key => pageInfo.properties[key]) as INotionPropertyInfo[];
      if (!pageProperties.length) {
        return null;
      }

      let args: Omit<ITodoHistoryOption, "id">[] = [];
      const pagePropertyIds = pageProperties.map((obj) => obj.id);
      const properties = this.getProperties(propertyUsages, pagePropertyIds);
      const appParentIds = this.getOptionIds(pageProperties, properties.parent);
      const registerProject = board.projectRule === ProjectRule.PARENT_TODO && !appParentIds.length;
      const name = this.getTitle(pageProperties, properties.title);
      if (!name) {
        return null;
      }
      const [startDate, deadline] = this.getDeadline(pageProperties, properties.deadline);
      let [project, todo] = await Promise.all([
        ProjectRepository.findOneByAppProjectId(TODO_APP_ID, pageId, company.id),
        TodoRepository.findOneByAppTodoId(TODO_APP_ID, pageId, company.id),
      ]);
      const appUrl = this.getDefaultStr(pageInfo, "url");
      const appCreatedAt = this.getDefaultDate(pageInfo, "created_time");
      const appCreatedBy = this.getEditedById(
        company.users,
        TODO_APP_ID,
        this.getDefaultStr(pageInfo, "created_by"),
      );
      const isDone = this.getIsStatus(pageProperties, properties.isDone);
      const isClosed = this.getIsStatus(pageProperties, properties.isClosed);
      const appUserIds = this.getOptionIds(pageProperties, properties.assignee);
      const users = appUserIds
        .map(appUserId => company.users?.find(u => u.todoAppUser?.appUserId === appUserId))
        .filter(u => u);
      const isDelayed = deadline
        ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date())) > 0
        : null;

      if (registerProject) {
        if (todo) {
          await this.deleteTodosByRecord([todo]);
        }
        const currentUserIds = project?.users
          ? project.users.map(p => p?.id).filter(id => id)
          : [];
        if (project) {
          args = await setHistoriesForExistingProject(project, users, startDate, deadline, isDone, isClosed, isDelayed);
          Object.assign(project, <Partial<Project>>{
            ...project,
            name,
            appUrl,
            appCreatedAt,
            appCreatedBy,
            startDate,
            deadline,
            isDone,
            isClosed,
          });
        } else {
          args = setHistoriesForNewProject(users, startDate, deadline, isDone, isClosed, isDelayed);
          project = new Project({
            name,
            todoAppId: TODO_APP_ID,
            company,
            appProjectId: pageId,
            appUrl,
            appCreatedAt,
            appCreatedBy,
            startDate,
            deadline,
            isDone,
            isClosed,
          });
        }
        return { type: "project", project, users, currentUserIds, args };
      } else {
        if (project) {
          await this.deleteProjectsByRecord([project]);
        }
        const projects = board.projectRule === ProjectRule.PARENT_TODO
          ? appParentIds
            .map(parentId => company.projects?.find(p => p.appProjectId === parentId))
            .filter(p => p)
          : [];
        const currentUserIds = todo?.users
          ? todo.users.map(u => u?.id).filter(id => id)
          : [];
        const currentProjectIds = todo?.projects
          ? todo.projects.map(p => p?.id).filter(id => id)
          : [];
        if (todo) {
          args = await setHistoriesForExistingTodo(todo, users, projects, startDate, deadline, isDone, isClosed, isDelayed);
          Object.assign(todo, <Partial<Todo>>{
            ...todo,
            name,
            appUrl,
            appCreatedAt,
            appCreatedBy,
            startDate,
            deadline,
            isDone,
            isClosed,
            appParentIds,
          });
        } else {
          args = setHistoriesForNewTodo(users, projects, startDate, deadline, isDone, isClosed, isDelayed);
          todo = new Todo({
            name,
            todoAppId: TODO_APP_ID,
            company,
            appTodoId: pageId,
            appUrl,
            appCreatedAt,
            appCreatedBy,
            startDate,
            deadline,
            isDone,
            isClosed,
            appParentIds,
          });
        }
        return { type: "todo", todo, projects, currentProjectIds, users, currentUserIds, args };
      }
    } catch(error) {
      logger.error(error.message, error);
      return null;
    }
  }

  private async deleteProjectsByRecord(projects: Project[]) {
    await Promise.all([
      ProjectRepository.softRemove(projects),
      ProjectHistoryRepository.saveHistories(projects.map(project => ({
        id: project.id,
        property: TodoHistoryProperty.NAME,
        action: HistoryAction.DELETE,
      }))),
    ]);
  }

  private async deleteTodosByRecord(todos: Todo[]) {
    await Promise.all([
      TodoRepository.softRemove(todos),
      TodoHistoryRepository.saveHistories(todos.map(todo => ({
        id: todo.id,
        property: TodoHistoryProperty.NAME,
        action: HistoryAction.DELETE,
      }))),
    ]);
  }

  private getProperties(usages: PropertyUsage[], propertyIds: string[]) {
    return {
      title: getUsageProperty(usages, propertyIds, UsageType.TITLE),
      section: getUsageProperty(usages, propertyIds, UsageType.SECTION),
      assignee: getUsageProperty(usages, propertyIds, UsageType.ASSIGNEE),
      deadline: getUsageProperty(usages, propertyIds, UsageType.DEADLINE),
      isDone: getUsageProperty(usages, propertyIds, UsageType.IS_DONE),
      isClosed: getUsageProperty(usages, propertyIds, UsageType.IS_CLOSED),
      parent: getUsageProperty(usages, propertyIds, UsageType.PARENT_TODO),
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
      logger.error(error.message, error);
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
      logger.error(error.message, error);
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
      logger.error(error.message, error);
      return [null, null];
    }
  }

  private getOptionIds(
    pageProperty: INotionPropertyInfo[],
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
      logger.error(error.message, error);
      return [];
    }
  }

  private getIsStatus(
    pageProperty: INotionPropertyInfo[],
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
      logger.error(error.message, error);
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
      logger.error(error.message, error);
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
      logger.error(error.message, error);
    }
  }
}
