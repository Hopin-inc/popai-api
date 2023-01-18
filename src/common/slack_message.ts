import { ITodo, IUser, ITodoSlack } from '../types';
import { Todo } from '../entify/todo.entity';
import { replyActionsAfter, replyActionsBefore } from "../const/slack";
import { relativeRemindDays } from "../const/common";

export class SlackMessageBuilder {
  static createRemindMessage(userName: string, todo: ITodo, remindDays: number) {
    const relativeDays = SlackMessageBuilder.getPrefixMessage(remindDays);
    const actions = remindDays > 0 ? replyActionsAfter : replyActionsBefore;
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${ relativeDays }が期日の<${ todo.todoapp_reg_url }|${ todo.name }>の進捗はいかがですか？`,
        },
      },
      {
        type: 'actions',
        elements: actions.map(action => {
          return {
            type: 'button',
            text: { type: 'plain_text', emoji: true, text: action.text },
            style: action.style,
            value: action.status,
          };
        }),
      },
    ];
    return { blocks };
  }

  static createReplaceMessage(userId: string, todo: Todo, message: string) {
    return {
      blocks: [
        {
          'type': 'section',
          'text': {
            'type': 'mrkdwn',
            'text': '<' + todo.todoapp_reg_url + '|' + todo.name + '>は' + message,
          },
        },
        // {
        //   'type': 'actions',
        //   'elements': [
        //     {
        //       'type': 'button',
        //       'text': {
        //         'type': 'plain_text',
        //         'emoji': true,
        //         'text': CHANGE_MESSAGE,
        //       },
        //       'value': 'click_me_123',
        //     }],
        // },
        {
          'type': 'context',
          'elements': [
            {
              'type': 'image',
              'image_url': 'https://image.freepik.com/free-photo/red-drawing-pin_1156-445.jpg',
              'alt_text': 'images',
            },
            {
              'type': 'mrkdwn',
              'text': '<@' + userId + '>が答えました',
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
          'type': 'section',
          'text': {
            'type': 'plain_text',
            'text': '完了しているんですね😌\nお疲れさまでした！\n\n担当いただき、ありがとうございます😊',
            'emoji': true,
          },
        },
      ],
    };
  }

  static createReplyInProgressMessage() {
    return {
      blocks: [
        {
          'type': 'section',
          'text': {
            'type': 'plain_text',
            'text': '承知しました👍',
            'emoji': true,
          },
        },
      ],
    };
  }

  static createDelayReplyMessage() {
    return {
      blocks: [
        {
          'type': 'section',
          'text': {
            'type': 'plain_text',
            'text': '承知しました😖\n引き続きよろしくお願いします💪',
            'emoji': true,
          },
        },
      ],
    };
  }

  static createWithdrawnReplyMessage() {
    return {
      blocks: [
        {
          'type': 'section',
          'text': {
            'type': 'plain_text',
            'text': 'そうなんですね😲\n承知しました💪',
            'emoji': true,
          },
        },
      ],
    };
  }

  static createReportToSuperiorMessage(superiorUserId: string) {
    return {
      blocks: [
        {
          'type': 'section',
          'text': {
            'type': 'mrkdwn',
            'text': '<@' + superiorUserId + '>ご確認ください👀',
          },
        },
      ],
    };
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

    const messages = {
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: `<@${ user.slack_id }>お疲れさまです🙌` },
        },
      ],
    };

    groupMessageMap.forEach((onedayTasks, remindDays) => {
      const messagePrefix = relativeRemindDays(remindDays);

      const summaryMessage =
        messagePrefix + 'タスクが' + onedayTasks.length + '件あります。';

      messages.blocks.push({
        'type': 'section',
        'text': {
          'type': 'mrkdwn',
          'text': summaryMessage,
        },
      });

      onedayTasks.forEach((todoSlack) => {
        messages.blocks.push({
          'type': 'section',
          'text': {
            'type': 'mrkdwn',
            'text': '- ' + todoSlack.todo.name,
          },
        });
      });
    });
    return messages;
  }

  static createListTaskMessageToAdmin(adminUser: IUser, todos: ITodo[]) {
    const message = {
      blocks: [{
        'type': 'section',
        'text': {
          'type': 'mrkdwn',
          'text': '<@' + adminUser.slack_id + '>お疲れさまです🙌\n現在、次のタスクの担当者と期日が設定されていません😭',
        },
      }],
    };

    todos.forEach((todo) =>
      message.blocks.push({
        'type': 'section',
        'text': {
          'type': 'mrkdwn',
          'text': '- ' + todo.name,
        },
      }),
    );

    message.blocks.push({
      'type': 'section',
      'text': {
        'type': 'mrkdwn',
        'text': 'ご確認をお願いします🙏',
      },
    });

    return message;
  }

  static createNotAssignListTaskMessageToAdmin(adminUser: IUser, todos: ITodo[]) {
    const notAssignTodos = [];
    todos.forEach((todo) =>
      notAssignTodos.push('🔖️ <' + todo.todoapp_reg_url + '|' + todo.name + '>'),
    );

    const message = {
      blocks: [{
        'type': 'section',
        'text': {
          'type': 'mrkdwn',
          'text': '<@' + adminUser.slack_id + '>お疲れさまです🙌\n現在、次のタスクの担当者が設定されていません😭\n\n' + notAssignTodos.join('\n'),
        },
      }],
    };

    message.blocks.push({
      'type': 'section',
      'text': {
        'type': 'mrkdwn',
        'text': 'ご確認をお願いします🙏',
      },
    });

    return message;
  }

  static createListTaskMessageToUser(user: IUser, todos: ITodo[]) {
    const message = {
      blocks: [{
        'type': 'section',
        'text': {
          'type': 'mrkdwn',
          'text': '<@' + user.slack_id + '>お疲れさまです🙌\n現在、次のタスクの期日が設定されていません😭',
        },
      }],
    };

    todos.forEach((todo) =>
      message.blocks.push({
        'type': 'section',
        'text': {
          'type': 'mrkdwn',
          'text': '- ' + todo.name,
        },
      }),
    );

    message.blocks.push({
      'type': 'section',
      'text': {
        'type': 'mrkdwn',
        'text': 'ご確認をお願いします🙏',
      },
    });

    return message;
  }

  static createNoListTaskMessageToAdmin(adminUser: IUser) {
    return {
      blocks: [{
        'type': 'section',
        'text': {
          'type': 'mrkdwn',
          'text': '<@' + adminUser.slack_id + '>お疲れさまです🙌\n現在、担当者・期日が設定されていないタスクはありませんでした。',
        },
      }],
    };
  }

  // 管理画面でチャットを閲覧できるようにするなどのために作った
  static getTextContentFromMessage(message) {
    return message.blocks[0].text.text;
  }

  static getPrefixMessage(remindDays: number): string {
    let messagePrefix = '';

    if (remindDays > 1) {
      messagePrefix = remindDays + '日前が期日の';
    } else if (remindDays === 1) {
      messagePrefix = '昨日が期日の';
    } else if (remindDays === 0) {
      messagePrefix = '今日が期日の';
    } else if (remindDays === -1) {
      messagePrefix = '明日が期日の';
    } else if (remindDays === -2) {
      messagePrefix = '明後日が期日の';
    } else {
      messagePrefix = -messagePrefix + '日後が期日の';
    }

    return messagePrefix;
  }
}