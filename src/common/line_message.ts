import { FlexMessage } from '@line/bot-sdk';
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
                label: '完了しております',
                data: JSON.stringify({
                  todo: {
                    id: todo.id,
                    name: todo.name,
                    assigned_user_id: todo.assigned_user_id,
                  },
                  status: TaskStatus.DONE,
                  user_name: userName,
                  message: '完了しております',
                }),
              },
            },
            {
              type: 'button',
              style: 'secondary',
              action: {
                type: 'postback',
                label: 'すみません、遅れております',
                data: JSON.stringify({
                  todo: {
                    id: todo.id,
                    name: todo.name,
                    assigned_user_id: todo.assigned_user_id,
                  },
                  status: TaskStatus.DELALYED,
                  user_name: userName,
                  message: 'すみません、遅れております',
                }),
              },
            },
          ],
        },
      },
    };

    return message;
  }

  static createReplyDoneMessage(superior: string) {
    const replyMessage: FlexMessage = {
      type: 'flex',
      altText: '当いただき担、ありがとうございます\n',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
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
              text: '当いただき担、ありがとうございます😭\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '{{上長(' + superior + ')}}さんに報告しておきますね💪',
              wrap: true,
            },
          ],
        },
      },
    };

    return replyMessage;
  }

  static createDeplayReplyMessage() {
    const replyMessage: FlexMessage = {
      type: 'flex',
      altText: '当いただき担、ありがとうございます\n',
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
}
