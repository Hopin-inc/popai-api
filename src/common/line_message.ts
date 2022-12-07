import { FlexComponent, FlexMessage, Message, QuickReply } from '@line/bot-sdk';
import { truncate } from '../utils/common';
import {
  DELAY_MESSAGE,
  DONE_MESSAGE,
  PROGRESS_GOOD_MESSAGE,
  PROGRESS_BAD_MESSAGE,
  WITHDRAWN_MESSAGE,
  LINE_MAX_LABEL_LENGTH,
} from '../const/common';
import { ITodo, ITodoLines, IUser } from '../types';

export class LineMessageBuilder {
  static createRemindMessage(
    messageToken: string,
    userName: string,
    todo: ITodo,
    remindDays: number
  ) {
    const messagePrefix = LineMessageBuilder.getPrefixMessage(remindDays);

    const quickReply: QuickReply = {
      items: [],
    };
    const messages: string[] =
      remindDays > 0
        ? [DONE_MESSAGE, DELAY_MESSAGE, WITHDRAWN_MESSAGE]
        : [PROGRESS_GOOD_MESSAGE, PROGRESS_BAD_MESSAGE, DONE_MESSAGE, WITHDRAWN_MESSAGE];
    messages.forEach((message) => {
      quickReply.items.push({
        type: 'action',
        action: {
          type: 'message',
          label: message,
          text: message,
        },
      });
    });

    const message: FlexMessage = {
      type: 'flex',
      altText: messagePrefix + '「' + todo.name + '」の進捗はいかがですか？\n',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            // {
            //   type: 'text',
            //   text: userName + 'さん',
            // },
            // {
            //   type: 'text',
            //   text: 'お疲れさまです🙌\n',
            //   wrap: true,
            // },
            {
              type: 'text',
              text: messagePrefix + '「' + todo.name + '」の進捗はいかがですか？\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '該当リンクはこちらです👀',
              wrap: true,
            },
            {
              type: 'button',
              style: 'link',
              action: {
                type: 'uri',
                label: truncate(todo.todoapp_reg_url, LINE_MAX_LABEL_LENGTH),
                uri: process.env.HOST + '/api/message/redirect/' + todo.id + '/' + messageToken,
              },
            },
          ],
        },
      },
      quickReply: quickReply,
    };

    return message;
  }

  static createReplyDoneMessage(superior?: string) {
    const contents: Array<FlexComponent> = [
      {
        type: 'text',
        text: '完了しているんですね😌\n',
        wrap: true,
      },
      {
        type: 'text',
        text: 'お疲れさまでした！',
        wrap: true,
      },
      {
        type: 'text',
        text: '担当いただき、ありがとうございます😊',
        wrap: true,
      },
    ];

    if (superior) {
      contents.push({
        type: 'text',
        text: '\n' + superior + 'さんに報告しておきますね💪',
        wrap: true,
      });
    }

    const replyMessage: FlexMessage = {
      type: 'flex',
      altText: '担当いただき、ありがとうございます😊',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: contents,
        },
      },
    };

    return replyMessage;
  }

  static createReplyInProgressMessage(superior?: string) {
    const contents: Array<FlexComponent> = [
      {
        type: 'text',
        text: '承知しました👍\n',
        wrap: true,
      },
    ];

    if (superior) {
      contents.push({
        type: 'text',
        text: superior + 'さんに共有しておきますね！',
        wrap: true,
      });
    }

    contents.push({
      type: 'text',
      text: '引き続きよろしくお願いします💪',
      wrap: true,
    });

    const replyMessage: FlexMessage = {
      type: 'flex',
      altText: '担当いただき、ありがとうございます😊',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: contents,
        },
      },
    };

    return replyMessage;
  }

  static createDelayReplyMessage() {
    const replyMessage: FlexMessage = {
      type: 'flex',
      altText: '担当いただき、ありがとうございます😊',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '承知しました😖',
              wrap: true,
            },
            {
              type: 'text',
              text: '引き続きよろしくお願いします💪',
              wrap: true,
            },
          ],
        },
      },
    };

    return replyMessage;
  }

  static createProcessingJobReplyMessage() {
    const replyMessage: FlexMessage = {
      type: 'flex',
      altText: '処理中です。少々お待ちください。',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '処理中です。少々お待ちください。',
              wrap: true,
            },
          ],
        },
      },
    };

    return replyMessage;
  }

  static createWithdrawnReplyMessage() {
    const replyMessage: FlexMessage = {
      type: 'flex',
      altText: '担当いただき、ありがとうございます😊',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'そうなんですね！承知しました😊',
              wrap: true,
            },
          ],
        },
      },
    };

    return replyMessage;
  }

  static createStartReportToSuperiorMessage(superiorUserName: string) {
    const reportMessage: FlexMessage = {
      type: 'flex',
      altText: '皆さんに進捗を聞いてきたので、ご報告させていただきます。',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: superiorUserName + 'さん\n',
            },
            {
              type: 'text',
              text: 'お疲れさまです🙌\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '皆さんに進捗を聞いてきたので、ご報告させていただきます。',
              wrap: true,
            },
          ],
        },
      },
    };

    return reportMessage;
  }

  static createUnKnownMessage() {
    const reportMessage: FlexMessage = {
      type: 'flex',
      altText: '申し訳ありませんが、こちらのアカウントから個別に返信することができません…\n',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'メッセージありがとうございます😊\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '申し訳ありませんが、こちらのアカウントから個別に返信することができません…',
              wrap: true,
            },
            {
              type: 'text',
              text: 'また何かありましたらご連絡しますね🙌',
              wrap: true,
            },
          ],
        },
      },
    };

    return reportMessage;
  }

  static createStartRemindMessageToUser(user: IUser, todoLines: ITodoLines[]) {
    const sortedTodoLines = todoLines.sort((a, b) => (a.remindDays < b.remindDays ? 1 : -1));

    const groupMessageMap = new Map<number, ITodoLines[]>();
    sortedTodoLines.forEach((item) => {
      if (groupMessageMap.has(item.remindDays)) {
        groupMessageMap.get(item.remindDays).push(item);
      } else {
        groupMessageMap.set(item.remindDays, [item]);
      }
    });

    const contents: Array<FlexComponent> = [
      {
        type: 'text',
        text: user.name + 'さん\n',
        wrap: true,
      },
      {
        type: 'text',
        text: 'お疲れ様です🙌',
        wrap: true,
      },
    ];

    let altText = '';
    groupMessageMap.forEach((onedayTasks, remindDays) => {
      const messagePrefix = LineMessageBuilder.getPrefixSummaryMessage(remindDays);

      const summaryMessage =
        '\n' + messagePrefix + 'タスクが' + onedayTasks.length + '件あります。';

      contents.push({
        type: 'text',
        text: summaryMessage,
        wrap: true,
      });

      onedayTasks.forEach((todoLine) => {
        contents.push({
          type: 'text',
          text: '・' + todoLine.todo.name,
          wrap: true,
        });
      });
      altText = summaryMessage;
    });

    const message: FlexMessage = {
      type: 'flex',
      altText: altText,
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: contents,
        },
      },
    };

    return message;
  }

  static createListTaskMessageToAdmin(adminUser: IUser, todos: ITodo[]) {
    const contents: Array<FlexComponent> = [
      {
        type: 'text',
        text: adminUser.name + 'さん\n',
        wrap: true,
      },
      {
        type: 'text',
        text: 'お疲れ様です🙌\n',
        wrap: true,
      },
      {
        type: 'text',
        text: '現在、次のタスクの担当者と期日が設定されていません😭',
        wrap: true,
      },
    ];

    todos.forEach((todo) =>
      contents.push({
        type: 'text',
        text: '・' + todo.name,
        wrap: true,
      })
    );

    contents.push({
      type: 'text',
      text: '\nご確認をお願いします🙏',
      wrap: true,
    });

    const message: FlexMessage = {
      type: 'flex',
      altText: '現在、次のタスクの担当者と期日が設定されていません😭',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: contents,
        },
      },
    };

    return message;
  }

  static createNotAssignListTaskMessageToAdmin(adminUser: IUser, todos: ITodo[]) {
    const contents: Array<FlexComponent> = [
      {
        type: 'text',
        text: adminUser.name + 'さん\n',
        wrap: true,
      },
      {
        type: 'text',
        text: 'お疲れ様です🙌\n',
        wrap: true,
      },
      {
        type: 'text',
        text: '現在、次のタスクの担当者が設定されていません😭',
        wrap: true,
      },
    ];

    todos.forEach((todo) =>
      contents.push({
        type: 'text',
        text: '・' + todo.name,
        wrap: true,
      })
    );

    contents.push({
      type: 'text',
      text: '\nご確認をお願いします🙏',
      wrap: true,
    });

    const message: FlexMessage = {
      type: 'flex',
      altText: '現在、次のタスクの担当者が設定されていません',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: contents,
        },
      },
    };

    return message;
  }

  static createListTaskMessageToUser(user: IUser, todos: ITodo[]) {
    const contents: Array<FlexComponent> = [
      {
        type: 'text',
        text: user.name + 'さん\n',
        wrap: true,
      },
      {
        type: 'text',
        text: 'お疲れ様です🙌\n',
        wrap: true,
      },
      {
        type: 'text',
        text: '現在、次のタスクの期日が設定されていません😭',
        wrap: true,
      },
    ];

    todos.forEach((todo) =>
      contents.push({
        type: 'text',
        text: '・' + todo.name,
        wrap: true,
      })
    );

    contents.push({
      type: 'text',
      text: '\nご確認をお願いします🙏',
      wrap: true,
    });

    const message: FlexMessage = {
      type: 'flex',
      altText: '現在、次のタスクの期日が設定されていません😭',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: contents,
        },
      },
    };

    return message;
  }

  static createNoListTaskMessageToAdmin(adminUser: IUser) {
    const contents: Array<FlexComponent> = [
      {
        type: 'text',
        text: adminUser.name + 'さん\n',
        wrap: true,
      },
      {
        type: 'text',
        text: 'お疲れ様です🙌\n',
        wrap: true,
      },
      {
        type: 'text',
        text: '現在、次のタスクの担当者・期日が設定されていないタスクはありませんでした！',
        wrap: true,
      },
      {
        type: 'text',
        text: '引き続きよろしくお願いします！',
        wrap: true,
      },
    ];

    const message: FlexMessage = {
      type: 'flex',
      altText: '現在、次のタスクの担当者・期日が設定されていないタスクはありませんでした！',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: contents,
        },
      },
    };

    return message;
  }

  static createReportToSuperiorMessage(
    superiorUserName: string,
    userName: string,
    taskName: string,
    reportContent: string
  ) {
    const reportMessage: FlexMessage = {
      type: 'flex',
      altText: userName + 'さんの進捗を共有します！',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: taskName + '\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '●担当者',
              wrap: true,
            },
            {
              type: 'text',
              text: userName + 'さん\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '●現在の進捗',
              wrap: true,
            },
            {
              type: 'text',
              text: reportContent,
              wrap: true,
            },
          ],
        },
      },
    };

    return reportMessage;
  }

  static getTextContentFromMessage(message: Message) {
    switch (message.type) {
      case 'text':
        return message.text;

      case 'flex':
        const texts = [];
        const messageContents = message.contents;

        if (messageContents.type == 'bubble') {
          const flexComponents = messageContents.body.contents ?? [];
          flexComponents.forEach((element) => {
            if (element.type == 'text') {
              texts.push(element.text);
            }
          });
        }

        return texts.join('\n');

      case 'audio':
        return message.originalContentUrl;

      case 'image':
        return message.originalContentUrl;

      case 'imagemap':
        return message.baseUrl;

      case 'location':
        return message.address;

      case 'sticker':
        return message.packageId;

      case 'template':
        return message.altText;

      case 'video':
        return message.originalContentUrl;

      default:
        return '';
    }
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
