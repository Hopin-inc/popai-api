import { Service } from "typedi";
import notionClient from "@/config/notion-client";
import { BlockObjectRequest, CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { IDailyReportItems } from "@/types";
import { TodoAppCode } from "@/consts/common";
import Todo from "@/entities/transactions/Todo";
import DocumentToolUser from "@/entities/settings/DocumentToolUser";
import logger from "@/logger/winston";
import { LoggerError } from "@/exceptions";

@Service()
export default class NotionPageBuilder {
  public async createDailyReportByUser(
    databaseId: string,
    user: DocumentToolUser,
    items: IDailyReportItems,
    createdAt: string,
    reportId: string,
  ): Promise<CreatePageParameters> {
    try {
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
        ...items.ongoing.map(async (og) => sentences.push(await this.createTodoSentence(og))),
        ...items.delayed.map(async (d) => sentences.push(await this.createTodoSentence(d, true))),
      ]);

      return {
        parent: { database_id: databaseId },
        icon: { emoji: "📝" },
        properties: {
          "タイトル": { title: [{ text: { content: `${user.user_name} ${createdAt}` } }] },
          "担当者": { people: [{ object: "user", id: user.auth_key }] },
          "日付": { date: { start: createdAt } },
          "種類": { select: { id: reportId } },
        },
        children: sentences,
      };
    } catch (error) {
      console.error(error);
      logger.error(new LoggerError(error.message));
    }
  }

  private async createTodoSentence(todo: Todo, isDelayed?: boolean): Promise<BlockObjectRequest> {
    try {
      switch (todo.todoapp.todo_app_code) {
        case TodoAppCode.NOTION:
          if (isDelayed) {
            await notionClient.pages.update(
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
          if (isDelayed) {
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
    } catch (error) {
      console.error(error);
      logger.error(new LoggerError(error.message));
    }
  }
}