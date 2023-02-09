import dayjs from "dayjs";
import "dayjs/locale/ja";

import { KnownBlock, MessageAttachment } from "@slack/web-api";

import Todo from "@/entities/Todo";
import User from "@/entities/User";

import { replyActionsAfter, replyActionsBefore } from "@/consts/slack";
import { diffDays, getDate, relativeRemindDays } from "@/utils/common";
import { ITodoSlack } from "@/types/slack";
import { IDailyReportItems, valueOf } from "@/types";
import { NOT_UPDATED_DAYS, TodoHistoryAction } from "@/consts/common";
import Section from "@/entities/Section";

dayjs.locale("ja");

export default class SlackMessageBuilder {
  static createRemindMessage(user: User, todo: Todo, remindDays: number) {
    const relativeDays = relativeRemindDays(remindDays);
    const actions = remindDays > 0 ? replyActionsAfter : replyActionsBefore;
    const blocks: KnownBlock[] = [
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*タスク:*\n<${todo.todoapp_reg_url}|${todo.name}>`,
          },
          {
            type: "mrkdwn",
            text: `*期日:*\n${relativeDays}`,
          },
        ],
      },
      {
        type: "actions",
        elements: actions.map(action => {
          return {
            type: "button",
            text: { type: "plain_text", emoji: true, text: action.text },
            style: action.style,
            value: action.status,
          };
        }),
      },
    ];
    return { blocks };
  }

  static createReplaceMessageAfterReply(userId: string, todo: Todo, message: string) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${todo.todoapp_reg_url}|${todo.name}>は *${message}* で伝えました`,
        },
      },
    ];
    return { blocks };
  }

  static createShareMessage(userId: string, todo: Todo, message: string) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*タスク:*\n<${todo.todoapp_reg_url}|${todo.name}>`,
          },
          {
            type: "mrkdwn",
            text: `*期日:*\n${dayjs(todo.deadline).format("M月D日(ddd)")}`,
          },
          {
            type: "mrkdwn",
            text: `*進捗:*\n${message}`,
          },
          {
            type: "mrkdwn",
            text: `*回答者:*\n<@${userId}>`,
          },
        ],
      },
    ];
    return { blocks };
  }

  static createBeforeRemindMessage(user: User, todoSlacks: ITodoSlack[]) {
    const sortedTodoSlacks = todoSlacks.sort((a, b) => (a.remindDays < b.remindDays ? 1 : -1));

    const groupMessageMap = new Map<number, ITodoSlack[]>();
    sortedTodoSlacks.forEach((item) => {
      if (groupMessageMap.has(item.remindDays)) {
        groupMessageMap.get(item.remindDays).push(item);
      } else {
        groupMessageMap.set(item.remindDays, [item]);
      }
    });

    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: "お仕事お疲れさまです:raised_hands:\n下記の進捗はいかがですか？" },
      },
    ];

    return { blocks };
  }

  static createNotifyUnsetMessage(adminUser: User, todos: Todo[]) {
    const todoList = todos.map(todo => `:bookmark: <${todo.todoapp_reg_url}|${todo.name}>`);
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "お疲れさまです:raised_hands:\n"
            + "現在、次のタスクの担当者と期日が設定されていません:sob:\n\n"
            + todoList.join("\n"),
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: "ご確認をお願いします:pray:" },
      },
    ];
    return { blocks };
  }

  static createNotifyUnassignedMessage(adminUser: User, todos: Todo[]) {
    const todoList = todos.map(todo => `:bookmark: <${todo.todoapp_reg_url}|${todo.name}>`);
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "お疲れさまです:raised_hands:\n"
            + "現在、次のタスクの担当者が設定されていません:sob:\n\n"
            + todoList.join("\n"),
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: "ご確認をお願いします:pray:" },
      },
    ];
    return { blocks };
  }

  static createNotifyNoDeadlineMessage(user: User, todos: Todo[]) {
    const todoList = todos.map(todo => `:bookmark: <${todo.todoapp_reg_url}|${todo.name}>`);
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${user.slackId}> お疲れさまです:raised_hands:\n`
            + "現在、次のタスクの期日が設定されていません:sob:\n\n"
            + todoList.join("\n"),
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: "ご確認をお願いします:pray:" },
      },
    ];
    return { blocks };
  }

  static createNotifyNothingMessage() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "お疲れさまです:raised_hands:\n"
            + "現在、担当者・期日が設定されていないタスクはありませんでした。",
        },
      },
    ];
    return { blocks };
  }

  static createNotifyOnCompletedMessage(todo: Todo) {
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: "タスクを完了しました！" },
    }];
    const attachmentBlocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*<${todo.todoapp_reg_url}|${todo.name}>*` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `*担当者:*\n${this.getAssigneesText(todo.users)}` },
          { type: "mrkdwn", text: `*期日:*\n${this.getDeadlineText(todo.deadline)}` },
        ],
      },
    ];
    const attachments: MessageAttachment[] = [{ color: "good", blocks: attachmentBlocks }];
    return { blocks, attachments };
  }

  static createNotifyOnAssigneeUpdatedMessage(
    todo: Todo,
    action: valueOf<typeof TodoHistoryAction>,
    assignees: User[],
  ) {
    const message = action === TodoHistoryAction.CREATE ? "タスクの担当者が設定されました！"
      : action === TodoHistoryAction.DELETE ? "タスクの担当者が削除されました。" : "タスクの担当者が変更されました！";
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: message },
    }];
    const attachmentBlocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*<${todo.todoapp_reg_url}|${todo.name}>*` },
      },
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*担当者:*\n~${this.getAssigneesText(todo.users)}~\n→ *${this.getAssigneesText(assignees)}*`,
          },
          { type: "mrkdwn", text: `*期日:*\n${this.getDeadlineText(todo.deadline)}` },
        ],
      },
    ];
    const attachments: MessageAttachment[] = [{ color: "good", blocks: attachmentBlocks }];
    return { blocks, attachments };
  }

  static createNotifyOnDeadlineUpdatedMessage(todo: Todo, action: valueOf<typeof TodoHistoryAction>, deadline: Date) {
    const message = action === TodoHistoryAction.CREATE ? "タスクの期日が設定されました！"
      : action === TodoHistoryAction.DELETE ? "タスクの期日が削除されました。" : "タスクの期日が変更されました！";
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: message },
    }];
    const attachmentBlocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*<${todo.todoapp_reg_url}|${todo.name}>*` },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `:busts_in_silhouette: *担当者:*\n${this.getAssigneesText(todo.users)}` },
          {
            type: "mrkdwn",
            text: `:calendar: *期日:*\n~${this.getDeadlineText(todo.deadline)}~\n→ *${this.getDeadlineText(deadline)}*`,
          },
        ],
      },
    ];
    const attachments: MessageAttachment[] = [{ color: "good", blocks: attachmentBlocks }];
    return { blocks, attachments };
  }

  private static getAssigneesText(assignees: User[]): string {
    return assignees?.length ? assignees.map(user => user.name).join("、") : "未設定";
  }

  private static getDeadlineText(deadline: Date): string {
    const remindDays = deadline ? diffDays(deadline, dayjs().toDate()) : null;
    return deadline ? `${relativeRemindDays(remindDays)} (${getDate(deadline)})` : "未設定";
  }

  public static createStartDailyReportMessage() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${dayjs().format("M月D日(ddd)")}の日報*`,
        },
      },
    ];
    return { blocks };
  }

  public static createDailyReportByUser(items: IDailyReportItems, sections: Section[], user: User, iconUrl: string) {
    const filterTodosByUser = (todos: Todo[], user: User): Todo[] => todos.filter(todo => {
      return todo.sections.some(section => sections.some(s => s.id === section.id))
        && todo.users.some(u => u.id === user.id);
    });
    const todosCompletedYesterday = filterTodosByUser(items.completedYesterday, user);
    const todosDelayed = filterTodosByUser(items.delayed, user);
    const todosOngoing = filterTodosByUser(items.ongoing, user);

    const listTodos = (todos: Todo[], warning: boolean = false): string => {
      if (todos.length) {
        const bullet = warning ? ":warning: " : "   •  ";
        return todos.map(todo => `${bullet}<${todo.todoapp_reg_url}|${todo.name}>`).join("\n");
      }
    };
    const noTodoMessage = "`ありません`";
    const todoListYesterday = todosCompletedYesterday.length ? listTodos(todosCompletedYesterday) : noTodoMessage;
    const todoListToday = todosDelayed.length + todosOngoing.length === 0 ? noTodoMessage
      : todosOngoing.length === 0 ? listTodos(todosDelayed, true)
        : todosDelayed.length === 0 ? listTodos(todosOngoing)
          : listTodos(todosDelayed, true) + "\n" + listTodos(todosOngoing);
    const blocks: KnownBlock[] = [
      {
        type: "context",
        elements: [
          { type: "image", image_url: iconUrl, alt_text: user.name },
          { type: "mrkdwn", text: `*${user.name}* さんの日報です。` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*昨日やったこと*\n${todoListYesterday}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*今日やること*\n${todoListToday}`,
        },
      },
    ];

    return { blocks };
  }

  public static createSuggestNotUpdatedTodoMessage(todo: Todo, user: User) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${NOT_UPDATED_DAYS}日以上更新されていないタスクを見つけました。\n`
            + `<@${user.slackId}> 見直しをお願いします。`,
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `:bookmark: <${todo.todoapp_reg_url}|${todo.name}>` },
      },
    ];
    return { blocks };
  }

  static getTextContentFromMessage(message: MessageAttachment) { //TODO:replyが記録できていない
    if (message.blocks && message.blocks.length) {
      const blocks = message.blocks as KnownBlock[];
      if (blocks[0].type === "section" && blocks[0].fields) {
        return blocks[0].fields.map(field => field.text)?.join("\n") ?? "";
      }
    } else if (message.actions && message.actions.length && message.actions[0].text) {
      return message.actions[0].text;
    }
    return "";
  }
}