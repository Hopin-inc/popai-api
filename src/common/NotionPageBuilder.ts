import { Service } from "typedi";
import { BlockObjectRequest, CreatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { IDailyReportItems } from "@/types";
import { TodoAppId } from "@/consts/common";
import Todo from "@/entities/transactions/Todo";
import logger from "@/logger/winston";
import NotionService from "@/services/NotionService";
import User from "@/entities/settings/User";
import TodoAppUser from "@/entities/settings/TodoAppUser";

@Service()
export default class NotionPageBuilder {
  public async createDailyReportByUser(
    databaseId: string,
    user: User,
    todoAppUser: TodoAppUser,
    items: IDailyReportItems,
    createdAt: string,
    notionClient: NotionService,
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
        ...items.completedYesterday.map(async (todo) => {
          return sentences.splice(1, 0, await this.createTodoSentence(todo, notionClient));
        }),
        ...items.ongoing.map(async (todo) => {
          return sentences.push(await this.createTodoSentence(todo, notionClient));
        }),
        ...items.delayed.map(async (todo) => {
          return sentences.push(await this.createTodoSentence(todo, notionClient, true));
        }),
      ]);

      return {
        parent: { database_id: databaseId },
        icon: { emoji: "📝" },
        properties: {
          "タイトル": { title: [{ text: { content: `${ user.name } ${ createdAt }` } }] },
          "担当者": { people: [{ object: "user", id: todoAppUser.user_app_id }] },
          "日付": { date: { start: createdAt } },
        },
        children: sentences,
      };
    } catch (error) {
      logger.error(error);
    }
  }

  private async createTodoSentence(todo: Todo, notionClient: NotionService, isDelayed?: boolean): Promise<BlockObjectRequest> {
    try {
      switch (todo.todoapp.id) {
        case TodoAppId.NOTION:
          if (isDelayed) {
            await notionClient.updatePage(
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
        case TodoAppId.TRELLO:
        case TodoAppId.MICROSOFT:
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
      logger.error(error);
    }
  }
}
