import { KnownBlock } from "@slack/web-api";

import Todo from "@/entities/Todo";

import { replyActionsAfter, replyActionsBefore } from "@/consts/slack";
import { relativeRemindDays, toJapanDateTime } from "@/utils/common";
import { ITodo, IUser } from "@/types";
import { ITodoSlack } from "@/types/slack";

export default class SlackMessageBuilder {
  static createRemindMessage(user: IUser, todo: ITodo, remindDays: number) {
    const relativeDays = relativeRemindDays(remindDays);
    const actions = remindDays > 0 ? replyActionsAfter : replyActionsBefore;
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${relativeDays}* までの<${todo.todoapp_reg_url}|${todo.name}>の進捗はいかがですか？`,
        },
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
            text: `*期日:*\n${this.formatDate(todo.deadline)}`,
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

  static createBeforeRemindMessage(user: IUser, todoSlacks: ITodoSlack[]) {
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
        text: { type: "mrkdwn", text: "お疲れさまです:raised_hands:" },
      },
    ];

    return { blocks };
  }

  static createNotifyUnsetMessage(adminUser: IUser, todos: ITodo[]) {
    const todoList = todos.map(todo => `:bookmark: <${todo.todoapp_reg_url}|${todo.name}>`);
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${adminUser.slack_id}> お疲れさまです:raised_hands:\n`
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

  static createNotifyUnassignedMessage(adminUser: IUser, todos: ITodo[]) {
    const todoList = todos.map(todo => `:bookmark: <${todo.todoapp_reg_url}|${todo.name}>`);
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${adminUser.slack_id}> お疲れさまです:raised_hands:\n`
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

  static createNotifyNoDeadlineMessage(user: IUser, todos: ITodo[]) {
    const todoList = todos.map(todo => `:bookmark: <${todo.todoapp_reg_url}|${todo.name}>`);
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${user.slack_id}> お疲れさまです:raised_hands:\n`
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

  static createNotifyNothingMessage(adminUser: IUser) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${adminUser.slack_id}> お疲れさまです:raised_hands:\n`
            + "現在、担当者・期日が設定されていないタスクはありませんでした。",
        },
      },
    ];
    return { blocks };
  }

  static getTextContentFromMessage(message) {
    return message.blocks[0].text.text;
  }

  static formatDate(date: Date) {
    const year = date.getFullYear();
    const month = `0${date.getMonth() + 1}`.slice(-2);
    const day = `0${date.getDate()}`.slice(-2);
    const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
    return `${year}年${month}月${day}日(${dayOfWeek})`;
  }
}