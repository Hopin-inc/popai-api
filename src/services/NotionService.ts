import { Service } from "typedi";
import { TodoAppId } from "@/consts/common";
import { ISelectItem } from "@/types/app";
import { Client } from "@notionhq/client";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";

@Service()
export default class NotionService {
  private client: Client;

  public static async init(companyId?: number): Promise<NotionService> {
    const notionInfo = await ImplementedTodoAppRepository.findOneBy({
      company_id: companyId,
      todoapp_id: TodoAppId.NOTION,
    });
    const accessToken = notionInfo?.access_token ?? process.env.NOTION_ACCESS_TOKEN;
    const service = new NotionService();
    service.client = new Client({ auth: accessToken });
    return service;
  }

  public async getUsers(): Promise<ISelectItem<string>[]> {
    let response = await this.client.users.list({});
    const users = response.results;
    while (response.has_more) {
      response = await this.client.users.list({
        start_cursor: response.next_cursor,
      });
      users.push(...response.results);
    }
    return users
      .filter(user => user.type === "person")
      .map(user => ({ id: user.id, name: user.name }));
  }
}