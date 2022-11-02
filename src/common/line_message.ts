import { FlexComponent, FlexMessage, Message } from '@line/bot-sdk';
import { truncate } from './../utils/common';
import { LINE_MAX_LABEL_LENGTH, TaskStatus } from '../const/common';
import { Todo } from '../entify/todo.entity';

export class LineMessageBuilder {
  static createRemindMessage(userName: string, todo: Todo) {
    const message: FlexMessage = {
      type: 'flex',
      altText: '昨日までの' + todo.name + 'の進捗はいかがですか？\n',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          spacing: 'md',
          contents: [
            {
              type: 'text',
              text: userName + 'さん',
            },
            {
              type: 'text',
              text: 'お疲れさまです🙌\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '昨日までの' + todo.name + 'の進捗はいかがですか？\n',
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
                uri: todo.todoapp_reg_url,
              },
            },
            {
              type: 'button',
              style: 'primary',
              action: {
                type: 'postback',
                displayText: '完了しております👍',
                label: '完了しております',
                data: JSON.stringify({
                  todo: {
                    id: todo.id,
                    name: todo.name,
                    assigned_user_id: todo.assigned_user_id,
                  },
                  status: TaskStatus.DONE,
                  user_name: userName,
                  message: '完了しております👍',
                }),
              },
            },
            {
              type: 'button',
              style: 'secondary',
              action: {
                type: 'postback',
                label: 'すみません、遅れております',
                displayText: 'すみません、遅れております🙇‍♂️',
                data: JSON.stringify({
                  todo: {
                    id: todo.id,
                    name: todo.name,
                    assigned_user_id: todo.assigned_user_id,
                  },
                  status: TaskStatus.DELALYED,
                  user_name: userName,
                  message: 'すみません、遅れております🙇‍♂️',
                }),
              },
            },
          ],
        },
      },
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
        text: '担当いただき、ありがとうございます😭\n',
        wrap: true,
      },
    ];

    if (superior) {
      contents.push({
        type: 'text',
        text: superior + 'さんに報告しておきますね💪',
        wrap: true,
      });
    }

    const replyMessage: FlexMessage = {
      type: 'flex',
      altText: '担当いただき、ありがとうございます\n',
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

  static createDeplayReplyMessage() {
    const replyMessage: FlexMessage = {
      type: 'flex',
      altText: '担当いただき、ありがとうございます\n',
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

  static createStartReportToSuperiorMessage(superiorUserName: string) {
    const reportMessage: FlexMessage = {
      type: 'flex',
      altText: '進捗報告開始\n',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: superiorUserName + 'さん',
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
      altText: '回答できない\n',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '回答できない。',
              wrap: true,
            },
          ],
        },
      },
    };

    return reportMessage;
  }

  static createListTaskMessage(todos: Array<Todo>) {
    const contents: Array<FlexComponent> = [
      {
        type: 'text',
        text: '期日未設定のタスク一覧\n',
        wrap: true,
      },
    ];

    todos.forEach((todo) =>
      contents.push({
        type: 'text',
        text: '.' + todo.name,
        wrap: true,
      })
    );

    const message: FlexMessage = {
      type: 'flex',
      altText: '期日未設定のタスク一覧が1つのメッセージ\n',
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

  static createNoListTaskMessage() {
    const contents: Array<FlexComponent> = [
      {
        type: 'text',
        text: '期日未設定のタスクがない旨のメッセージ\n',
        wrap: true,
      },
    ];

    const message: FlexMessage = {
      type: 'flex',
      altText: '期日未設定のタスクがない旨のメッセージ\n',
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
      altText: userName + 'からのレポート\n',
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
              text: reportContent + '😅',
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

        return '';
    }
  }
}
