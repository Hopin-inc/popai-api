import { Controller } from "tsoa";
import { IsNull, Not } from "typeorm";
import { IPropertyUsage, ISelectItem, ITodoAppInfo } from "@/types/app";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";
import { ValueOf } from "@/types";
import { TodoAppId } from "@/consts/common";
import NotionService from "@/services/NotionService";

export default class TodoAppController extends Controller {
  private notionService: NotionService;

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
        this.notionService = await NotionService.init(companyId);
        return this.notionService.getUsers();
      default:
        return [];
    }
  }

  public async getBoards(todoAppId: ValueOf<typeof TodoAppId>, companyId: number): Promise<ISelectItem<string>[]> {
    switch (todoAppId) {
      case TodoAppId.NOTION:
        this.notionService = await NotionService.init(companyId);
        return this.notionService.getWorkspaces();
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
        this.notionService = await NotionService.init(companyId);
        return this.notionService.getProperties(boardId);
      default:
        return [];
    }
  }

  public async getUsages(
    _todoAppId: ValueOf<typeof TodoAppId>,
    _companyId: number,
    _boardId: string,
  ): Promise<IPropertyUsage[]> {
    return []; // FIXME
  }

  public async updateUsages(
    _data: Partial<IPropertyUsage>,
    _todoAppId: ValueOf<typeof TodoAppId>,
    _companyId: number,
    _boardId: string,
  ): Promise<any> {
    return; // FIXME
  }
}