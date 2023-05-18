import { Controller } from "tsoa";
import { FindOptionsWhere, IsNull, Not } from "typeorm";
import { IProperty, IPropertyUsage, ISelectItem, ITodoAppInfo } from "@/types/app";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";
import { ValueOf } from "@/types";
import { TodoAppId, UsageType } from "@/consts/common";
import NotionClient from "@/integrations/NotionClient";
import { BoardRepository } from "@/repositories/settings/BoardRepository";
import Board from "@/entities/settings/Board";
import { BoardConfigRepository } from "@/repositories/settings/BoardConfigRepository";
import BoardConfig from "@/entities/settings/BoardConfig";
import { PropertyUsageRepository } from "@/repositories/settings/PropertyUsageRepository";
import PropertyUsage from "@/entities/settings/PropertyUsage";
import { TodoAppUserRepository } from "@/repositories/settings/TodoAppUserRepository";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import { UserRepository } from "@/repositories/settings/UserRepository";
import BacklogClient from "@/integrations/BacklogClient";
import BacklogRepository from "@/repositories/BacklogRepository";

export default class TodoAppController extends Controller {
  public async get(companyId: string): Promise<ITodoAppInfo> {
    const implementedTodoApp = await ImplementedTodoAppRepository.findOne({
      where: { companyId: companyId, accessToken: Not(IsNull()) },
      order: { todoAppId: "asc" },
    });
    if (implementedTodoApp) {
      const { todoAppId, appWorkspaceId } = implementedTodoApp;
      return { todoAppId, workspaceId: appWorkspaceId };
    } else {
      return null;
    }
  }

  public async getUsers(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: string,
    baseUrl: string,
  ): Promise<ISelectItem<string>[]> {
    switch (todoAppId) {
      case TodoAppId.NOTION:
        const notionService = await NotionClient.init(companyId);
        return notionService.getUsers();
      case TodoAppId.BACKLOG:
        const backlogService = await BacklogClient.init(companyId, baseUrl);
        return backlogService.getUsers();
      default:
        return [];
    }
  }

  public async updateTodoAppUser(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: string,
    userId: string,
    appUserId: string,
  ): Promise<any> {
    const user = await UserRepository.findOneBy({ id: userId, companyId: companyId });
    switch (todoAppId) {
      case TodoAppId.NOTION:
        if (user) {
          await TodoAppUserRepository.upsert(new TodoAppUser(userId, todoAppId, appUserId), []);
        }
        return;
      case TodoAppId.BACKLOG:
        if (user) {
          await TodoAppUserRepository.upsert(new TodoAppUser(userId, todoAppId, appUserId), []);
        }
        return;
      default:
        return;
    }
  }

  public async getBoardConfig(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: string,
  ): Promise<{ boardId: string | null }> {
    const board = await BoardRepository.findOneByConfig(companyId);
    return { boardId: board?.appBoardId };
  }

  public async updateBoardConfig(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: string,
    boardId: string,
    baseUrl: string,
  ): Promise<any> {
    const board = await BoardRepository.findOneByConfig(companyId);
    const oldBoardId = board?.appBoardId;
    if (board) {
      board.appBoardId = boardId;
      await Promise.all([
        BoardRepository.upsert(board, []),
        board.propertyUsages && board.propertyUsages.length
          ? PropertyUsageRepository.softDelete(board.propertyUsages.map(usage => usage.id))
          : null,
      ]);
    } else {
      const board = await BoardRepository.save(new Board(todoAppId, boardId));
      await BoardConfigRepository.save(new BoardConfig(companyId, board.id));
    }
    if (todoAppId === TodoAppId.BACKLOG) {
      const baseQuery: FindOptionsWhere<PropertyUsage> = { todoAppId: TodoAppId.BACKLOG };
      let [isDoneUsage, isClosedUsage] = await Promise.all([
        PropertyUsageRepository.findOneBy({ ...baseQuery, usage: UsageType.IS_DONE }),
        PropertyUsageRepository.findOneBy({ ...baseQuery, usage: UsageType.IS_CLOSED }),
      ]);
      if (!isDoneUsage) {
        isDoneUsage = new PropertyUsage( TodoAppId.BACKLOG, board, "status", 0, UsageType.IS_DONE);
      } else {
        isDoneUsage.boardId = board.id;
      }
      if (!isClosedUsage) {
        isClosedUsage = new PropertyUsage( TodoAppId.BACKLOG, board, "status", 0, UsageType.IS_CLOSED);
      } else {
        isClosedUsage.boardId = board.id;
      }

      const backlogClient = await BacklogClient.init(companyId, baseUrl);
      const backlogRepository = new BacklogRepository();
      const projectId = parseInt(boardId);
      await Promise.all([
        oldBoardId ? backlogClient.deleteWebhooks(companyId, parseInt(oldBoardId)) : null,
        backlogClient.addWebhook(companyId, projectId),
        backlogRepository.fetchTodos(companyId, projectId, board),
        PropertyUsageRepository.upsert([isDoneUsage, isClosedUsage], []),
      ]);
    }
  }

  public async getBoards(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: string,
    baseUrl: string,
  ): Promise<ISelectItem<string>[]> {
    switch (todoAppId) {
      case TodoAppId.NOTION:
        const notionService = await NotionClient.init(companyId);
        return notionService.getWorkspaces();
      case TodoAppId.BACKLOG:
        const backlogService = await BacklogClient.init(companyId, baseUrl);
        return backlogService.getProjects();
      default:
        return [];
    }
  }

  public async getProperties(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: string,
    boardId: string,
    baseUrl: string,
  ): Promise<IProperty[]> {
    switch (todoAppId) {
      case TodoAppId.NOTION:
        const notionService = await NotionClient.init(companyId);
        return notionService.getProperties(boardId);
      case TodoAppId.BACKLOG:
        const backlogService = await BacklogClient.init(companyId, baseUrl);
        return backlogService.getProperties(parseInt(boardId));
      default:
        return [];
    }
  }

  public async getUsages(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: string,
    boardId: string,
  ): Promise<IPropertyUsage[]> {
    const board = await BoardRepository.findOneByConfig(companyId, boardId);
    return board?.propertyUsages.map(u => ({
      id: u.id,
      property: u.appPropertyId,
      usage: u.usage,
      type: u.type,
      options: u.appOptions,
      isChecked: u.boolValue,
    })) ?? [];
  }

  public async updateUsages(
    data: IPropertyUsage,
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: string,
    boardId: string,
  ): Promise<IPropertyUsage> {
    const { id, property, usage, type, options, isChecked } = data;
    let board = await BoardRepository.findOneByConfig(companyId, boardId);
    if (!board) {
      board = await BoardRepository.save(new Board(todoAppId, boardId));
      await BoardConfigRepository.save(new BoardConfig(companyId, board.id));
    }
    const targetUsage = data.id ? board.propertyUsages?.find(u => u.id === id) : null;
    if (targetUsage) {
      await PropertyUsageRepository.update(targetUsage.id, {
        appPropertyId: property,
        usage,
        type,
        appOptions: options,
        boolValue: isChecked,
      });
      return data;
    } else {
      const targetUsage = new PropertyUsage(todoAppId, board.id, property, type, usage, options, isChecked);
      const newUsage = await PropertyUsageRepository.save(targetUsage);
      return {
        id: newUsage.id,
        property: newUsage.appPropertyId,
        usage: newUsage.usage,
        type: newUsage.type,
        options: newUsage.appOptions,
        isChecked: newUsage.boolValue,
      };
    }
  }
}
