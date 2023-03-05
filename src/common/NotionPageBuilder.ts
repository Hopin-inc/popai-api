import { Service } from "typedi";

import { BlockObjectRequest, CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { IDailyReportItems } from "@/types";
import { TodoAppCode } from "@/consts/common";

import { Client } from "@notionhq/client";

import TodoAppUser from "@/entities/settings/TodoAppUser";
import Todo from "@/entities/transactions/Todo";

@Service()
export default class NotionPageBuilder {
  private notionRequest: Client;

  constructor() {
    this.notionRequest = new Client({ auth: process.env.NOTION_ACCESS_TOKEN });
  }

  public async createDailyReportByUser(
    databaseId: string,
    user: TodoAppUser,
    items: IDailyReportItems,
    createdAt: string,
    reportId: string,
  ): Promise<CreatePageParameters> {
    const sentences: Array<BlockObjectRequest> = [
      {
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: [{ type: "text", text: { content: "昨日やったこと" } }] },
      },
      { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: "" } }] } },
      {
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: [{ type: "text", text: { content: "今日やること" } }] },
      }];

    await Promise.all([
      ...items.completedYesterday.map(async (cy) => sentences.splice(1, 0, await this.createTodoSentence(cy))),
      ...items.ongoing.map(async (cy) => sentences.push(await this.createTodoSentence(cy))),
      ...items.delayed.map(async (cy) => sentences.push(await this.createTodoSentence(cy, true))),
    ]);

    return {
      parent: { database_id: databaseId },
      properties: {
        "タイトル": { title: [{ text: { content: `${user.user_app_name} ${createdAt}` } }] },
        "担当者": { people: [{ object: "user", id: user.user_app_id }] },
        "日付": { date: { start: createdAt } },
        "種類": { select: { id: reportId } },
      },
      children: sentences,
    };
  }

  private async createTodoSentence(todo: Todo, isDelay?: boolean): Promise<BlockObjectRequest> {
    switch (todo.todoapp.todo_app_code) {
      case TodoAppCode.NOTION:
        if (isDelay) {
          await this.notionRequest.pages.update(
            {
              page_id: todo.todoapp_reg_id,
              icon: { type: "emoji", emoji: "🚨" },
            });
        }
        return {
          object: "block", type: "bulleted_list_item",
          bulleted_list_item: {
            rich_text: [{ type: "mention", mention: { page: { id: todo.todoapp_reg_id } } }],
          },
        };
      case TodoAppCode.TRELLO || TodoAppCode.MICROSOFT:
        if (isDelay) {
          return {
            object: "block", type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [{ type: "text", text: { content: "🚨" } }, {
                type: "text",
                text: { content: todo.name, link: { url: todo.todoapp_reg_url } },
              }],
            },
          };
        } else {
          return {
            object: "block", type: "bulleted_list_item",
            bulleted_list_item: {
              rich_text: [{
                type: "text",
                text: { content: todo.name, link: { url: todo.todoapp_reg_url } },
              }],
            },
          };
        }
    }
  }
}