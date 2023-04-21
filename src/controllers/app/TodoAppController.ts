import { Controller } from "tsoa";
import { IsNull, Not } from "typeorm";
import { IPropertyUsage, ISelectItem, ITodoAppInfo } from "@/types/app";
import { CompanyTodoAppRepository } from "@/repositories/settings/CompanyTodoAppRepository";
import { ValueOf } from "@/types";
import { TodoAppId } from "@/consts/common";
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

export default class TodoAppController extends Controller {
  public async getList(companyId: string): Promise<ITodoAppInfo[]> {
    const implementedTodoApps = await CompanyTodoAppRepository.find({
      where: { companyId: companyId, accessToken: Not(IsNull()) },
      order: { todoAppId: "asc" },
    });
    return implementedTodoApps.map(cta => ({
      todoAppId: cta.todoAppId,
      workspaceId: cta.appWorkspaceId,
    }));
  }

  public async getUsers(todoAppId: ValueOf<typeof TodoAppId>, companyId: string): Promise<ISelectItem<string>[]> {
    switch (todoAppId) {
      case TodoAppId.NOTION:
        const notionService = await NotionClient.init(companyId);
        return notionService.getUsers();
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
    switch (todoAppId) {
      case TodoAppId.NOTION:
        const user = await UserRepository.findOneBy({ id: userId, companyId: companyId });
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
    const board = await BoardRepository.findOneByConfig(todoAppId, companyId);
    return { boardId: board?.appBoardId };
  }

  public async updateBoardConfig(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: string,
    boardId: string,
  ): Promise<any> {
    let board = await BoardRepository.findOneByConfig(todoAppId, companyId);
    if (board) {
      board.appBoardId = boardId;
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

  public async getBoards(todoAppId: ValueOf<typeof TodoAppId>, companyId: string): Promise<ISelectItem<string>[]> {
    switch (todoAppId) {
      case TodoAppId.NOTION:
        const notionService = await NotionClient.init(companyId);
        return notionService.getWorkspaces();
      default:
        return [];
    }
  }

  public async getProperties(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: string,
    boardId: string,
  ): Promise<ISelectItem<string>[]> {
    switch (todoAppId) {
      case TodoAppId.NOTION:
        const notionService = await NotionClient.init(companyId);
        return notionService.getProperties(boardId);
      default:
        return [];
    }
  }

  public async getUsages(
    todoAppId: ValueOf<typeof TodoAppId>,
    companyId: string,
    boardId: string,
  ): Promise<IPropertyUsage[]> {
    const board = await BoardRepository.findOneByConfig(todoAppId, companyId, boardId);
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
    let board = await BoardRepository.findOneByConfig(todoAppId, companyId, boardId);
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
