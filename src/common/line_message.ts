import { FlexMessage, QuickReply } from '@line/bot-sdk';

export class LineMessageBuilder {
  static createRemindMessage(userName: string, taskName: string, taskUrl: string) {
    const quickReplyItems: QuickReply = {
      /**
       * This is a container that contains
       * [quick reply buttons](https://developers.line.biz/en/reference/messaging-api/#quick-reply-button-object).
       *
       * Array of objects (Max: 13)
       */
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '完了しております',
            text: '完了しております (taskId: 1234)',
          },
        },

        {
          type: 'action',
          action: {
            type: 'message',
            label: 'すみません、遅れております',
            text: 'すみません、遅れております (taskId: 1234)',
          },
        },
      ],
    };

    const message: FlexMessage = {
      type: 'flex',
      altText: '昨日までの' + taskName + 'の進捗はいかがですか？\n',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: userName + 'さん\n\n',
            },
            {
              type: 'text',
              text: '\nお疲れさまです\n\n',
            },
            {
              type: 'text',
              text: '昨日までの' + taskName + 'の進捗はいかがですか？\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '該当リンクはこちらです\n',
              wrap: true,
            },
            {
              type: 'text',
              text: taskUrl,
              wrap: true,
            },
          ],
        },
      },
      quickReply: quickReplyItems,
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
              text: '完了しているんですね😌\n\n',
            },
            {
              type: 'text',
              text: 'お疲れさまでした！\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '当いただき担、ありがとうございます😭\n\n',
              wrap: true,
            },
            {
              type: 'text',
              text: '{{上長(' + superior + ')}}さんに報告しておきますね💪\n',
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
              text: '承知しました😖\n',
            },
            {
              type: 'text',
              text: '引き続きよろしくお願いします💪\n',
            },
          ],
        },
      },
    };

    return replyMessage;
  }

  static createReportToSuperiorMessage(superiorUserName: string, reportContent: string) {
    const reportMessage: FlexMessage = {
      type: 'flex',
      altText: superiorUserName + 'からのレポート\n',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '報告者：' + superiorUserName + '\n',
            },
            {
              type: 'text',
              text: 'レポート内容：' + reportContent + '\n',
              wrap: true,
            },
          ],
        },
      },
    };

    return reportMessage;
  }
}
