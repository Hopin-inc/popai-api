import {
  FlexBox,
  FlexBubble,
  FlexCarousel,
  FlexComponent,
  FlexContainer,
  FlexMessage,
  Message, Profile,
  TextMessage,
} from "@line/bot-sdk";

import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";

import { formatDatetime, sliceByNumber, relativeRemindDays } from "@/utils/common";
import {
  replyMessagesBefore,
  replyMessagesAfter,
  ReplyMessage,
  Colors,
  MessageAssets,
  ButtonStylesByColor,
} from "@/consts/line";
import { IDailyReportItems, ITodoLines } from "@/types";
import LineBot from "@/config/line-bot";
import { GreetingMessage } from "@/consts/common";
import lineBot from "@/config/line-bot";
import LineProfile from "@/entities/transactions/LineProfile";

export default class LineMessageBuilder {
  static createRemindMessage(messageToken: string, userName: string, todo: Todo, remindDays: number) {
    const relativeDays = relativeRemindDays(remindDays);
    const remindColor = LineMessageBuilder.getRemindColor(remindDays);
    const taskUrl = process.env.ENV === "local"
      ? todo.todoapp_reg_url
      : `${process.env.HOST}/api/message/redirect/${todo.id}/${messageToken}`;
    const message: FlexMessage = {
      type: "flex",
      altText: `「${todo.name}」の進捗はいかがですか？`,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: todo.name,
              weight: "bold",
              size: "xl",
              wrap: true,
              action: {
                type: "uri",
                label: "action",
                uri: taskUrl,
              },
            },
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    { type: "text", text: "期限", color: "#BDBDBD", size: "sm", flex: 1 },
                    {
                      type: "text",
                      wrap: true,
                      color: "#666666",
                      size: "md",
                      flex: 5,
                      contents: [
                        { type: "span", text: relativeDays, weight: "bold", color: remindColor },
                        { type: "span", text: `(${formatDatetime(todo.deadline)})`, size: "sm" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          spacing: "md",
          contents: [],
          flex: 0,
        },
      },
    };

    const buttons: ReplyMessage[] = remindDays > 0 ? replyMessagesAfter : replyMessagesBefore;
    buttons.filter(b => b.primary).forEach(button => (message.contents as FlexBubble).footer?.contents.push({
      type: "button",
      style: ButtonStylesByColor[button.color],
      height: "md",
      action: {
        type: "postback",
        label: button.label,
        data: button.status,
        displayText: button.displayText,
      },
      color: Colors[button.color],
    }));
    const secondaryButtonContents: FlexBox[] = [];
    sliceByNumber(buttons.filter(b => !b.primary), 2).forEach(row => {
      const content: FlexBox = {
        type: "box",
        layout: "horizontal",
        contents: [],
        spacing: "md",
      };
      row.forEach(button => content.contents.push({
        type: "button",
        style: ButtonStylesByColor[button.color],
        height: "md",
        action: {
          type: "postback",
          label: button.label,
          data: button.status,
          displayText: button.displayText,
        },
        color: Colors[button.color],
      }));
      secondaryButtonContents.push(content);
    });
    (message.contents as FlexBubble).footer?.contents.push(...secondaryButtonContents);
    return message;
  }

  static createResponseToReplyDone(superior?: string): TextMessage {
    let text = "完了しているんですね😌\n"
      + "お疲れさまでした！\n\n"
      + "担当いただき、ありがとうございます😊";
    if (superior) {
      text += `\n\n${superior}さんに報告しておきますね💪`;
    }
    return { type: "text", text };
  }

  static createResponseToReplyInProgress(superior?: string): TextMessage {
    let text = "承知しました👍\n";
    if (superior) {
      text += `${superior}さんに報告しておきますね💪\n\n`;
    }
    text += "引き続きよろしくお願いします💪";
    return { type: "text", text };
  }

  static createResponseToReplyDelayed(): TextMessage {
    const text = "承知しました😖\n引き続きよろしくお願いします💪";
    return { type: "text", text };
  }

  static createResponseToReplyWithdrawn(): TextMessage {
    const text = "そうなんですね！承知しました😊";
    return { type: "text", text };
  }

  static createBotMessageOnProcessingJob(): TextMessage {
    const text = "処理中です。少々お待ちください。";
    return { type: "text", text };
  }

  static createBeforeReportMessage(superior: string): TextMessage {
    const text = `${superior}さん\n`
      + "お疲れさまです🙌\n\n"
      + "タスクの進捗を聞いてきたので、ご報告いたします。";
    return { type: "text", text };
  }

  static createBotMessageOnUndefined(): TextMessage {
    const text = "メッセージありがとうございます😊\n\n"
      + "申し訳ありませんが、こちらのアカウントから個別に返信することができません…\n"
      + "また何かありましたらお知らせしますね🙌";
    return { type: "text", text };
  }

  static createBeforeRemindMessage(user: User, todoLines: ITodoLines[], superior?: string) {
    const sortedTodoLines = todoLines.sort((a, b) => (a.remindDays < b.remindDays ? 1 : -1));

    const groupMessageMap = new Map<number, ITodoLines[]>();
    sortedTodoLines.forEach((item) => {
      if (groupMessageMap.has(item.remindDays)) {
        groupMessageMap.get(item.remindDays).push(item);
      } else {
        groupMessageMap.set(item.remindDays, [item]);
      }
    });

    let firstText = `${user.name}さん、お疲れ様です！\nタスクの進捗をお尋ねします🙇`;
    if (superior) {
      firstText += `\nお答えいただいた内容を${superior}さんにお伝えします！`;
    }
    const messages: (TextMessage | FlexMessage)[] = [{
      type: "text",
      text: firstText,
    }];
    messages.push({
      type: "flex",
      altText: firstText,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [],
          spacing: "xl",
        },
      },
    });

    groupMessageMap.forEach((targetDueTodos, remindDays) => {
      const relativeDays = relativeRemindDays(remindDays);
      const remindColor = LineMessageBuilder.getRemindColor(remindDays);
      const targetDueBlock: FlexBox = {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "box",
            layout: "baseline",
            contents: [{
              type: "text",
              weight: "regular",
              size: "sm",
              wrap: true,
              contents: [
                { type: "span", text: relativeDays, weight: "bold", color: remindColor },
                { type: "span", text: `が期日のタスク: ${targetDueTodos.length}件` },
              ],
              color: "#757575",
            }],
            spacing: "xs",
          },
          { type: "box", layout: "vertical", contents: [] },
        ],
        spacing: "sm",
      };
      targetDueTodos.forEach(todoLine => {
        (targetDueBlock.contents[1] as FlexBox).contents.push({
          type: "box",
          layout: "baseline",
          spacing: "sm",
          contents: [
            { type: "icon", url: MessageAssets.CHECK, size: "sm" },
            { type: "text", text: todoLine.todo.name, wrap: false },
          ],
          action: { type: "uri", label: "タスクの詳細", uri: todoLine.todo.todoapp_reg_url },
        });
      });
      ((messages[1] as FlexMessage).contents as FlexBubble).body?.contents.push(targetDueBlock);
    });

    return messages;
  }

  static createNotifyUnsetMessage(todos: Todo[]): FlexMessage {
    const message: FlexMessage = {
      type: "flex",
      altText: `現在、${todos.length}件のタスクの担当者・期日が設定されていません😭`,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "icon", url: MessageAssets.ALERT, size: "xs" },
                {
                  type: "text",
                  weight: "regular",
                  size: "sm",
                  wrap: true,
                  contents: [
                    { type: "span", text: `${todos.length}件のタスクの` },
                    { type: "span", text: "担当者・期日", weight: "bold" },
                    { type: "span", text: "が未設定です。" },
                  ],
                  color: Colors.alert,
                },
              ],
              spacing: "xs",
            },
            {
              type: "box",
              layout: "vertical",
              contents: [],
            },
          ],
          spacing: "sm",
        },
      },
    };
    todos.forEach(todo => ((message.contents as FlexBubble).body.contents[1] as FlexBox).contents.push({
      type: "box",
      layout: "baseline",
      spacing: "sm",
      contents: [
        { type: "icon", url: MessageAssets.CHECK, size: "sm" },
        { type: "text", text: todo.name, wrap: false },
      ],
      action: { type: "uri", label: "タスクの詳細", uri: todo.todoapp_reg_url },
    }));
    return message;
  }

  static createNotifyUnassignedMessage(todos: Todo[]): FlexMessage {
    const message: FlexMessage = {
      type: "flex",
      altText: `現在、${todos.length}件のタスクの担当者が設定されていません😭`,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "icon", url: MessageAssets.ALERT, size: "xs" },
                {
                  type: "text",
                  weight: "regular",
                  size: "sm",
                  wrap: true,
                  contents: [
                    { type: "span", text: `${todos.length}件のタスクの` },
                    { type: "span", text: "担当者", weight: "bold" },
                    { type: "span", text: "が未設定です。" },
                  ],
                  color: Colors.alert,
                },
              ],
              spacing: "xs",
            },
            {
              type: "box",
              layout: "vertical",
              contents: [],
            },
          ],
          spacing: "sm",
        },
      },
    };
    todos.forEach(todo => ((message.contents as FlexBubble).body.contents[1] as FlexBox).contents.push({
      type: "box",
      layout: "baseline",
      spacing: "sm",
      contents: [
        { type: "icon", url: MessageAssets.CHECK, size: "sm" },
        { type: "text", text: todo.name, wrap: false },
      ],
      action: { type: "uri", label: "タスクの詳細", uri: todo.todoapp_reg_url },
    }));
    return message;
  }

  static createNotifyNoDeadlineMessage(todos: Todo[]): FlexMessage {
    const message: FlexMessage = {
      type: "flex",
      altText: `現在、${todos.length}件のタスクの期日が設定されていません😭`,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "box",
              layout: "baseline",
              contents: [
                { type: "icon", url: MessageAssets.ALERT, size: "xs" },
                {
                  type: "text",
                  weight: "regular",
                  size: "sm",
                  wrap: true,
                  contents: [
                    { type: "span", text: `${todos.length}件のタスクの` },
                    { type: "span", text: "期日", weight: "bold" },
                    { type: "span", text: "が未設定です。" },
                  ],
                  color: Colors.alert,
                },
              ],
              spacing: "xs",
            },
            {
              type: "box",
              layout: "vertical",
              contents: [],
            },
          ],
          spacing: "sm",
        },
      },
    };
    todos.forEach(todo => ((message.contents as FlexBubble).body.contents[1] as FlexBox).contents.push({
      type: "box",
      layout: "baseline",
      spacing: "sm",
      contents: [
        { type: "icon", url: MessageAssets.CHECK, size: "sm" },
        { type: "text", text: todo.name, wrap: false },
      ],
      action: { type: "uri", label: "タスクの詳細", uri: todo.todoapp_reg_url },
    }));
    return message;
  }

  static createNotifyNothingMessage(adminUser: User): TextMessage {
    return {
      type: "text",
      text: `${adminUser.name}さん\n`
        + "お疲れ様です🙌\n\n"
        + "現在、次のタスクの担当者・期日が設定されていないタスクはありませんでした！\n"
        + "引き続きよろしくお願いします！",
    };
  }

  static createReportMessage(
    username: string,
    taskName: string,
    taskUrl: string,
    deadline: Date,
    remindDays: number,
    content: string,
  ): FlexMessage {
    const relativeDays = relativeRemindDays(remindDays);
    return {
      type: "flex",
      altText: `${username}さんから「${taskName}」の進捗共有がありました！`,
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "text",
              text: taskName,
              weight: "bold",
              size: "xl",
              wrap: true,
              action: { type: "uri", label: "タスクの詳細", uri: taskUrl },
            },
            {
              type: "box",
              layout: "vertical",
              margin: "lg",
              spacing: "sm",
              contents: [
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    { type: "text", text: "期限", color: "#BDBDBD", size: "sm", flex: 1 },
                    {
                      type: "text",
                      wrap: true,
                      color: "#666666",
                      size: "md",
                      flex: 4,
                      contents: [
                        { type: "span", text: relativeDays, weight: "bold", color: this.getRemindColor(remindDays) },
                        { type: "span", text: `(${formatDatetime(deadline)})`, size: "sm" },
                      ],
                    },
                  ],
                },
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    { type: "text", text: "担当者", color: "#BDBDBD", size: "sm", flex: 1 },
                    { type: "text", text: `${username}さん`, color: "#666666", size: "md", flex: 4, wrap: true },
                  ],
                },
                {
                  type: "box",
                  layout: "baseline",
                  spacing: "sm",
                  contents: [
                    { type: "text", text: "進捗", color: "#BDBDBD", size: "sm", flex: 1 },
                    { type: "text", text: content, color: "#666666", size: "md", flex: 4, wrap: true },
                  ],
                },
              ],
            },
          ],
        },
      },
    };
  }

  static createGreetingMessage(): TextMessage {
    return {
      type: "text",
      text: GreetingMessage[Math.floor(Math.random() * GreetingMessage.length)],
    };
  }

  static async createDailyReportByCompany(
    users: User[],
    items: IDailyReportItems,
  ): Promise<FlexMessage> {
    const byCompany: FlexCarousel = { type: "carousel", contents: [] };
    const today = new Date();

    const message: FlexMessage = {
      type: "flex",
      altText: `${today.getMonth() + 1}月${today.getDate()}日の日報です🙌`,
      contents: byCompany,
    };
    const getOperation = users.map(async (user) => {
      const profile = await lineBot.getProfile(user.lineId);
      return this.getDailyReportByUser(user, items, profile);
    });
    byCompany.contents = await Promise.all(getOperation);
    return message;
  }

  static getDailyReportByUser(
    user: User,
    items: IDailyReportItems,
    profile: Profile,
  ): FlexBubble {
    const completedYesterdayNumber = items.completedYesterday.filter(c => c.todoUsers.some(tu => tu.user_id === user.id)).length;
    const onGoingNumber = items.ongoing.filter(c => c.todoUsers.some(tu => tu.user_id === user.id)).length;
    const delayedTodos = items.delayed.filter(c => c.todoUsers.some(tu => tu.user_id === user.id));

    const reportByUser: FlexBubble = {
      type: "bubble",
      size: "kilo",
      hero: {
        type: "image",
        url: profile.pictureUrl,
        size: "full",
        aspectMode: "cover",
        aspectRatio: "320:213",
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: profile.displayName, weight: "bold", size: "lg", wrap: true, margin: "md" },
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "昨日", color: "#BDBDBD", size: "sm", flex: 1 },
              {
                type: "text",
                text: `${completedYesterdayNumber}件`,
                color: "#666666",
                size: "md",
                wrap: true,
                flex: 4,
                weight: "bold",
              },
            ],
          },
          {
            type: "box",
            layout: "baseline",
            contents: [
              { type: "text", text: "本日", color: "#BDBDBD", size: "sm", flex: 1 },
              {
                type: "text",
                text: `${onGoingNumber}件`,
                color: "#666666",
                size: "md",
                wrap: true,
                flex: 4,
                weight: "bold",
              },
            ],
          },
        ],
        spacing: "sm",
        paddingAll: "13px",
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: {
              type: "uri",
              label: "くわしく見る",
              uri: "http://linecorp.com/", //TODO:notionのurlを添付する
            },
            height: "md",
            style: "secondary",
            color: "#F6F6F6",
          },
        ],
      },
    };

    delayedTodos.map(d => reportByUser.body.contents.push({
      type: "text",
      text: `🚨${d.name}`,
      size: "xs",
      color: "#666666",
      offsetTop: "md",
      action: { type: "uri", label: "タスクの詳細", uri: d.todoapp_reg_url },
    }));

    return reportByUser;
  }

  static getTextContentFromMessage(message: Message): string {
    switch (message.type) {
      case "text":
        return message.text;

      case "flex":
        const texts = [];
        const findText = (components: FlexComponent[]) => {
          components.forEach(component => {
            switch (component.type) {
              case "text":
                if (component.text) {
                  texts.push(component.text);
                } else if (component.contents) {
                  findText(component.contents);
                }
                break;
              case "span":
                const lastText = texts.pop();
                texts.push(lastText + component.text);
                break;
              case "box":
                if (component.contents) {
                  findText(component.contents);
                }
                break;
              default:
                break;
            }
          });
        };

        const messageContents = message.contents;
        if (messageContents.type === "bubble") {
          const flexComponents = messageContents.body?.contents ?? [];
          findText(flexComponents);
        }
        return texts.join("\n");

      case "audio":
        return message.originalContentUrl;

      case "image":
        return message.originalContentUrl;

      case "imagemap":
        return message.baseUrl;

      case "location":
        return message.address;

      case "sticker":
        return message.packageId;

      case "template":
        return message.altText;

      case "video":
        return message.originalContentUrl;

      default:
        return "";
    }
  }

  static getRemindColor(remindDays: number): string {
    return remindDays > 0 ? Colors.alert : Colors.warning;
  }
}