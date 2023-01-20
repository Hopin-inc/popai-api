import { ITodo, IUser, ITodoSlack } from "../types";
import { Todo } from "../entify/todo.entity";
import { replyActionsAfter, replyActionsBefore } from "../const/slack";
import { relativeRemindDays } from "../const/common";
import { KnownBlock } from "@slack/web-api";

export class SlackMessageBuilder {
  static createRemindMessage(userName: string, todo: ITodo, remindDays: number) {
    const relativeDays = SlackMessageBuilder.relativeRemindDays(remindDays);
    const actions = remindDays > 0 ? replyActionsAfter : replyActionsBefore;
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${relativeDays}が期日の<${todo.todoapp_reg_url}|${todo.name}>の進捗はいかがですか？`,
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

  static createReplaceMessage(userId: string, todo: Todo, message: string) {
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

  static createReplyDoneMessage() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "完了しているんですね😌\nお疲れさまでした！\n\n担当いただき、ありがとうございます😊",
          emoji: true,
        },
      },
    ];
    return { blocks };
  }

  static createReplyInProgressMessage() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "承知しました👍",
          emoji: true,
        },
      },
    ];
    return { blocks };
  }

  static createDelayReplyMessage() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "承知しました😖\n引き続きよろしくお願いします💪",
          emoji: true,
        },
      },
    ];
    return { blocks };
  }

  static createWithdrawnReplyMessage() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "plain_text",
          text: "そうなんですね😲\n承知しました💪",
          emoji: true,
        },
      },
    ];
    return { blocks };
  }

  static createReportToSuperiorMessage(superiorUserId: string) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${superiorUserId}>ご確認ください👀`,
        },
      },
    ];
    return { blocks };
  }

  static createStartRemindMessageToUser(user: IUser, todoSlacks: ITodoSlack[]) {
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
        text: { type: "mrkdwn", text: `<@${user.slack_id}>お疲れさまです🙌` },
      },
    ];

    groupMessageMap.forEach((onedayTasks, remindDays) => {
      const relativeDays = relativeRemindDays(remindDays);
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${relativeDays}が期日のタスクが${onedayTasks.length}件あります。`,
        },
      });
      onedayTasks.forEach(todoSlack => {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `🔖️ <${todoSlack.todo.todoapp_reg_url}|${todoSlack.todo.name}>`,
          },
        });
      });
    });
    return { blocks };
  }

  static createListTaskMessageToAdmin(adminUser: IUser, todos: ITodo[]) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${adminUser.slack_id}>お疲れさまです🙌\n現在、次のタスクの担当者と期日が設定されていません😭`,
        },
      },
    ];

    todos.forEach((todo) =>
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔖️ <${todo.todoapp_reg_url}|${todo.name}>`,
        },
      }),
    );

    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "ご確認をお願いします🙏" },
    });

    return { blocks };
  }

  static createNotAssignListTaskMessageToAdmin(adminUser: IUser, todos: ITodo[]) {
    const notAssignTodos = [];
    todos.forEach((todo) =>
      notAssignTodos.push(`🔖️ <${todo.todoapp_reg_url}|${todo.name}>`),
    );

    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${adminUser.slack_id}>お疲れさまです🙌\n現在、次のタスクの担当者が設定されていません😭\n\n`
            + notAssignTodos.join("\n"),
        },
      },
    ];

    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "ご確認をお願いします🙏" },
    });

    return { blocks };
  }

  static createListTaskMessageToUser(user: IUser, todos: ITodo[]) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${user.slack_id}>お疲れさまです🙌\n現在、次のタスクの期日が設定されていません😭`,
        },
      },
    ];

    todos.forEach(todo =>
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔖️ <${todo.todoapp_reg_url}|${todo.name}>`,
        },
      })
    );

    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "ご確認をお願いします🙏" },
    });

    return { blocks };
  }

  static createNoListTaskMessageToAdmin(adminUser: IUser) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${adminUser.slack_id}>お疲れさまです🙌\n現在、担当者・期日が設定されていないタスクはありませんでした。`,
        },
      },
    ];
    return { blocks };
  }

  // 管理画面でチャットを閲覧できるようにするなどのために作った
  static getTextContentFromMessage(message) {
    return message.blocks[0].text.text;
  }

  static relativeRemindDays(remindDays: number): string {
    if (remindDays > 1) {
      return `${remindDays.toString()}日前`;
    } else if (remindDays === 1) {
      return "昨日";
    } else if (remindDays === 0) {
      return "今日";
    } else if (remindDays === -1) {
      return "明日";
    } else if (remindDays === -2) {
      return "あさって";
    } else {
      return `${(-remindDays).toString()}日後`;
    }
  }
}