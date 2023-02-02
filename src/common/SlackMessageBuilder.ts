import { KnownBlock } from "@slack/web-api";

import Todo from "@/entities/Todo";
import User from "@/entities/User";

import { replyActionsAfter, replyActionsBefore } from "@/consts/slack";
import { relativeRemindDays } from "@/utils/common";
import { ITodoSlack } from "@/types/slack";

export default class SlackMessageBuilder {
  static createRemindMessage(user: User, todo: Todo, remindDays: number) {
    const relativeDays = relativeRemindDays(remindDays);
    const actions = remindDays > 0 ? replyActionsAfter : replyActionsBefore;
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${user.slackId}> ${relativeDays}が期日の<${todo.todoapp_reg_url}|${todo.name}>の進捗はいかがですか？`,
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
          text: `<${todo.todoapp_reg_url}|${todo.name}>は${message}`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "image",
            image_url: "https://image.freepik.com/free-photo/red-drawing-pin_1156-445.jpg",
            alt_text: "image",
          },
          { type: "mrkdwn", text: `<@${userId}>が答えました` },
        ],
      },
    ];
    return { blocks };
  }

  static createResponseToReplyDone() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "完了しているんですね:relieved:\nお疲れさまでした！\n\n担当いただき、ありがとうございます:blush:",
          emoji: true,
        },
      },
    ];
    return { blocks };
  }

  static createResponseToReplyInProgress() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "承知しました:+1:",
          emoji: true,
        },
      },
    ];
    return { blocks };
  }

  static createResponseToReplyDelayed() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "承知しました:confounded:\n引き続きよろしくお願いします:muscle:",
          emoji: true,
        },
      },
    ];
    return { blocks };
  }

  static createResponseToReplyWithdrawn() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "そうなんですね:open_mouth:\n承知しました:muscle:",
          emoji: true,
        },
      },
    ];
    return { blocks };
  }

  static createReportMessage(superiorUser: User) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${superiorUser.slackId}> ご確認ください:eyes:`,
        },
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
        text: { type: "mrkdwn", text: `<@${user.slackId}> お疲れさまです:raised_hands:` },
      },
    ];

    groupMessageMap.forEach((onedayTasks, remindDays) => {
      const relativeDays = relativeRemindDays(remindDays);
      const todoList = onedayTasks.map(todo => `:bookmark: <${todo.todo.todoapp_reg_url}|${todo.todo.name}>`);
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${relativeDays}が期日のタスクが${onedayTasks.length}件あります。\n\n` + todoList.join("\n"),
        },
      });
    });
    return { blocks };
  }

  static createNotifyUnsetMessage(adminUser: User, todos: Todo[]) {
    const todoList = todos.map(todo => `:bookmark: <${todo.todoapp_reg_url}|${todo.name}>`);
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${adminUser.slackId}> お疲れさまです:raised_hands:\n`
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
          text: `<@${adminUser.slackId}> お疲れさまです:raised_hands:\n`
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

  static createNotifyNothingMessage(adminUser: User) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${adminUser.slackId}> お疲れさまです:raised_hands:\n`
            + "現在、担当者・期日が設定されていないタスクはありませんでした。",
        },
      },
    ];
    return { blocks };
  }

  static getTextContentFromMessage(message) {
    return message.blocks[0].text.text;
  }
}