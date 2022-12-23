// noinspection DuplicatedCode

import {
  DELAY_MESSAGE,
  DONE_MESSAGE,
  PROGRESS_BAD_MESSAGE,
  PROGRESS_GOOD_MESSAGE,
  WITHDRAWN_MESSAGE,
} from '../const/common';
import { ITodo, IUser, ITodoSlacks } from '../types';
import { MessageAttachment } from '@slack/web-api';

export class SlackMessageBuilder {
  static createRemindMessage(
    userName: string,
    todo: ITodo,
    remindDays: number,
  ) {
    const messagePrefix = SlackMessageBuilder.getPrefixMessage(remindDays);

    return remindDays > 0
      ? {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'markdown',
              text: messagePrefix + '<' + todo.todoapp_reg_url + '|' + todo.name + '>の進捗はいかがですか？',
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: DONE_MESSAGE,
                },
                style: 'primary',
                value: 'click_me_123',
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: WITHDRAWN_MESSAGE,
                },
                style: 'danger',
                value: 'click_me_123',
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: DELAY_MESSAGE,
                },
                value: 'click_me_123',
              },
            ],
          },
        ],
      }
      : {
        blocks: [
          {
            type: 'section',
            text: {
              type: 'markdown',
              text: messagePrefix + '<' + todo.todoapp_reg_url + '|' + todo.name + '>の進捗はいかがですか？',
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: DONE_MESSAGE,
                },
                style: 'primary',
                value: 'click_me_123',
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: WITHDRAWN_MESSAGE,
                },
                style: 'danger',
                value: 'click_me_123',
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: PROGRESS_GOOD_MESSAGE,
                },
                value: 'click_me_123',
              },
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  emoji: true,
                  text: PROGRESS_BAD_MESSAGE,
                },
                value: 'click_me_123',
              },
            ],
          },
        ],
      };
  }

  static createReplyDoneMessage() {
    return {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: '完了しているんですね😌\nお疲れさまでした！\n\n担当いただき、ありがとうございます😊',
            emoji: true,
          },
        },
      ],
    };
  }

  static createReplyInProgressMessage() {
    return {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: '承知しました👍',
            emoji: true,
          },
        },
      ],
    };
  }

  static createDelayReplyMessage() {
    return {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: '承知しました😖\n引き続きよろしくお願いします💪',
            emoji: true,
          },
        },
      ],
    };
  }


  static createWithdrawnReplyMessage() {
    return {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'plain_text',
            text: 'そうなんですね😲\n承知しました💪',
            emoji: true,
          },
        },
      ],
    };
  }

  static createReportToSuperiorMessage(superiorUserId: string, channelId: string, threadId: string) {
    return {
      blocks: [
        {
          type: 'section',
          channel_id: channelId,
          thread_ts: threadId,
          text: {
            type: 'markdown',
            text: '<' + superiorUserId + '>ご確認ください👀',
          },
        },
      ],
    };
  }

  static createStartRemindMessageToUser(user: IUser, todoSlacks: ITodoSlacks[]) {
    const sortedTodoSlacks = todoSlacks.sort((a, b) => (a.remindDays < b.remindDays ? 1 : -1));

    const groupMessageMap = new Map<number, ITodoSlacks[]>();
    sortedTodoSlacks.forEach((item) => {
      if (groupMessageMap.has(item.remindDays)) {
        groupMessageMap.get(item.remindDays).push(item);
      } else {
        groupMessageMap.set(item.remindDays, [item]);
      }
    });

    const messages = {
      blocks: [
        {
          type: 'section',
          text: {
            type: 'markdown',
            text: user.name + 'お疲れさまです🙌',
          },
        },
      ],
    };

    groupMessageMap.forEach((onedayTasks, remindDays) => {
      const messagePrefix = SlackMessageBuilder.getPrefixSummaryMessage(remindDays);

      const summaryMessage =
        messagePrefix + 'タスクが' + onedayTasks.length + '件あります。';

      messages['blocks'].push({
        type: 'section',
        text: {
          type: 'markdown',
          text: summaryMessage,
        },
      });

      onedayTasks.forEach((todoSlack) => {
        messages['blocks'].push({
          type: 'text',
          text: {
            type: 'markdown',
            text: '- ' + todoSlack.todo.name,
          },
        });
      });
    });
    return messages;
  }

  static createListTaskMessageToAdmin(adminUser: IUser, todos: ITodo[]) {
    const message = {
      blocks: [{
        type: 'section',
        text: {
          type: 'markdown',
          text: adminUser.name + 'お疲れさまです🙌\n現在、次のタスクの担当者と期日が設定されていません😭',
        },
      }],
    };

    todos.forEach((todo) =>
      message['blocks'].push({
        type: 'section',
        text: {
          type: 'markdown',
          text: '- ' + todo.name,
        },
      }),
    );

    message['blocks'].push({
      type: 'section',
      text: {
        type: 'markdown',
        text: 'ご確認をお願いします🙏',
      },
    });

    return message;
  }

  static createNotAssignListTaskMessageToAdmin(adminUser: IUser, todos: ITodo[]) {
    const message = {
      blocks: [{
        type: 'section',
        text: {
          type: 'markdown',
          text: adminUser.name + 'お疲れさまです🙌\n現在、次のタスクの担当者が設定されていません😭',
        },
      }],
    };

    todos.forEach((todo) =>
      message['blocks'].push({
        type: 'section',
        text: {
          type: 'markdown',
          text: '- ' + todo.name,
        },
      }),
    );

    message['blocks'].push({
      type: 'section',
      text: {
        type: 'markdown',
        text: 'ご確認をお願いします🙏',
      },
    });

    return message;
  }

  static createListTaskMessageToUser(user: IUser, todos: ITodo[]) {
    const message = {
      blocks: [{
        type: 'section',
        text: {
          type: 'markdown',
          text: user.name + 'お疲れさまです🙌\n現在、次のタスクの期日が設定されていません😭',
        },
      }],
    };

    todos.forEach((todo) =>
      message['blocks'].push({
        type: 'section',
        text: {
          type: 'markdown',
          text: '- ' + todo.name,
        },
      }),
    );

    message['blocks'].push({
      type: 'section',
      text: {
        type: 'markdown',
        text: 'ご確認をお願いします🙏',
      },
    });

    return message;
  }

  static createNoListTaskMessageToAdmin(adminUser: IUser) {
    return {
      blocks: [{
        type: 'section',
        text: {
          type: 'markdown',
          text: adminUser.name + 'お疲れさまです🙌\n現在、担当者・期日が設定されていないタスクはありませんでした。',
        },
      }],
    };
  }

  // 管理画面でチャットを閲覧できるようにするなどのために作った
  static getTextContentFromMessage(message: MessageAttachment) {
    return message.text;
  }

  static getPrefixMessage(remindDays: number): string {
    let messagePrefix = '';

    if (remindDays > 1) {
      messagePrefix = remindDays + '日前が期日の';
    } else if (remindDays == 1) {
      messagePrefix = '昨日が期日の';
    } else if (remindDays == 0) {
      messagePrefix = '今日が期日の';
    } else if (remindDays == -1) {
      messagePrefix = '明日が期日の';
    } else if (remindDays == -2) {
      messagePrefix = '明後日が期日の';
    } else {
      messagePrefix = -messagePrefix + '日後が期日の';
    }

    return messagePrefix;
  }

  static getPrefixSummaryMessage(remindDays: number): string {
    let messagePrefix = '';

    if (remindDays > 1) {
      messagePrefix = remindDays + '日前が期日の';
    } else if (remindDays == 1) {
      messagePrefix = '昨日が期日の';
    } else if (remindDays == 0) {
      messagePrefix = '今日が期日の';
    } else if (remindDays == -1) {
      messagePrefix = '明日が期日の';
    } else if (remindDays == -2) {
      messagePrefix = '明後日が期日の';
    } else {
      messagePrefix = -messagePrefix + '日後が期日の';
    }

    return messagePrefix;
  }
}