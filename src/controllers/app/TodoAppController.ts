import { Controller } from "tsoa";
import { IsNull, Not } from "typeorm";
import { IPropertyUsage, ISelectItem, ITodoAppInfo } from "@/types/app";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";
import { ValueOf } from "@/types";
import { TodoAppId } from "@/consts/common";
import NotionService from "@/services/NotionService";
import { BoardRepository } from "@/repositories/settings/BoardRepository";
import Board from "@/entities/settings/Board";
import { BoardConfigRepository } from "@/repositories/settings/BoardConfigRepository";
import BoardConfig from "@/entities/settings/BoardConfig";
import { PropertyUsageRepository } from "@/repositories/settings/PropertyUsageRepository";
import PropertyUsage from "@/entities/settings/PropertyUsage";
import { TodoAppUserRepository } from "@/repositories/settings/TodoAppUserRepository";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import { UserRepository } from "@/repositories/settings/UserRepository";

export default class TodoAppController extends Controller {
  public async getList(companyId: number): Promise<ITodoAppInfo[]> {
    const implementedTodoApps = await ImplementedTodoAppRepository.find({
      where: { company_id: companyId, access_token: Not(IsNull()) },
      order: { todoapp_id: "asc" },
    });
    return implementedTodoApps.map(ict => ({
      todoAppId: ict.todoapp_id,
      workspaceId: ict.app_workspace_id,
    }));
  }

  public async getUsers(todoAppId: ValueOf<typeof TodoAppId>, companyId: number): Promise<ISelectItem<string>[]> {
    switch (todoAppId) {
      case TodoAppId.NOTION:
        const notionService = await NotionService.init(companyId);
        return notionService.getUsers();
      default:
        return [];
    }
  }

  public async updateTodoAppUser(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: number,
    userId: number,
    appUserId: string,
  ): Promise<any> {
    switch (todoAppId) {
      case TodoAppId.NOTION:
        const notionService = await NotionService.init(companyId);
        const [user, notionUsers] = await Promise.all([
          UserRepository.findOneBy({ id: userId, company_id: companyId }),
          notionService.getUsers(true),
        ]);
        if (user) {
          const { name, email } = notionUsers.find(u => u.id);
          await TodoAppUserRepository.upsert(new TodoAppUser(todoAppId, userId, appUserId, name, email), []);
        }
        return;
      default:
        return;
    }
  }

  public async getBoardConfig(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: number,
  ): Promise<{ boardId: string | null }> {
    const board = await BoardRepository.findOneByConfig(todoAppId, companyId);
    return { boardId: board?.app_board_id };
  }

  public async updateBoardConfig(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: number,
    boardId: string,
  ): Promise<any> {
    let board = await BoardRepository.findOneByConfig(todoAppId, companyId);
    if (board) {
      board.app_board_id = boardId;
    } else {
      board = new Board(todoAppId, boardId);
      board.configs = [new BoardConfig(companyId, board.id)];
    }
    await Promise.all([
      BoardRepository.upsert(board, []),
      board.propertyUsages && board.propertyUsages.length
        ? PropertyUsageRepository.softDelete(board.propertyUsages.map(usage => usage.id))
        : null,
    ]);
  }

  public async getBoards(todoAppId: ValueOf<typeof TodoAppId>, companyId: number): Promise<ISelectItem<string>[]> {
    switch (todoAppId) {
      case TodoAppId.NOTION:
        const notionService = await NotionService.init(companyId);
        return notionService.getWorkspaces();
      default:
        return [];
    }
  }

  public async getProperties(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: number,
    boardId: string,
  ): Promise<ISelectItem<string>[]> {
    switch (todoAppId) {
      case TodoAppId.NOTION:
        const notionService = await NotionService.init(companyId);
        return notionService.getProperties(boardId);
      default:
        return [];
    }
  }

  public async getUsages(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: number,
    boardId: string,
  ): Promise<IPropertyUsage[]> {
    const board = await BoardRepository.findOneByConfig(todoAppId, companyId, boardId);
    return board?.propertyUsages.map(u => ({
      id: u.id,
      property: u.app_property_id,
      usage: u.usage,
      type: u.type,
      options: u.app_options,
      isChecked: u.bool_value,
    })) ?? [];
  }

  public async updateUsages(
    data: IPropertyUsage,
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: number,
    boardId: string,
  ): Promise<IPropertyUsage> {
    const { id, property, usage, type, options, isChecked } = data;
    let board = await BoardRepository.findOneByConfig(todoAppId, companyId, boardId);
    if (!board) {
      board = await BoardRepository.save(new Board(todoAppId, boardId));
      await BoardConfigRepository.save(new BoardConfig(companyId, board.id));
    }
    const targetUsage = data.id ? board.propertyUsages?.find(u => u.id === id) : null;
    if (targetUsage) {
      await PropertyUsageRepository.update(targetUsage.id, {
        app_property_id: property,
        usage,
        type,
        app_options: options,
        bool_value: isChecked,
      });
      return data;
    } else {
      const targetUsage = new PropertyUsage(board.id, property, type, usage, options, isChecked);
      const newUsage = await PropertyUsageRepository.save(targetUsage);
      return {
        id: newUsage.id,
        property: newUsage.app_property_id,
        usage: newUsage.usage,
        type: newUsage.type,
        options: newUsage.app_options,
        isChecked: newUsage.bool_value,
      };
    }
  }
}