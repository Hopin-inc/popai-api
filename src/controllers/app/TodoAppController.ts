import { Controller } from "tsoa";
import { FindOptionsWhere } from "typeorm";
import Company from "@/entities/settings/Company";
import { ISelectItem, ITodoAppInfo } from "@/types/app";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";
import ImplementedTodoApp from "@/entities/settings/ImplementedTodoApp";
import { valueOf } from "@/types";
import { TodoAppId } from "@/consts/common";
import NotionService from "@/services/NotionService";

export default class TodoAppController extends Controller {
  private notionService: NotionService;

  public async getList(company?: Company): Promise<ITodoAppInfo[]> {
    const where: FindOptionsWhere<ImplementedTodoApp> = company ? { company_id: company.id } : {};
    const implementedTodoApps = await ImplementedTodoAppRepository.find({
      where,
      order: { todoapp_id: "asc" },
    });
    return implementedTodoApps.map(ict => ({
      todoAppId: ict.todoapp_id,
      workspaceId: ict.app_workspace_id,
    }));
  }

  public async getUsers(todoAppId: valueOf<typeof TodoAppId>, companyId: number): Promise<ISelectItem<string>[]> {
    switch (todoAppId) {
      case TodoAppId.NOTION:
        this.notionService = await NotionService.init(companyId);
        return this.notionService.getUsers();
      default:
        return [];
    }
  }
}