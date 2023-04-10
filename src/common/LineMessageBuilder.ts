import {
  FlexBox,
  FlexBubble,
  FlexCarousel,
  FlexMessage,
  Profile,
  TextMessage,
} from "@line/bot-sdk";

import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";

import { formatDatetime, relativeRemindDays, sliceByNumber } from "@/utils/common";
import {
  ButtonStylesByColor,
  Colors,
  MessageAssets,
  ReplyMessage,
  replyMessagesAfter,
  replyMessagesBefore,
} from "@/consts/line";
import { IDailyReportItems, ITodoLines } from "@/types";
import { GreetingMessage, PraiseMessage } from "@/consts/common";
import lineBot from "@/config/line-bot";
import { INotionDailyReport } from "@/types/notion";

export default class LineMessageBuilder {
  static createRemindMessage(messageToken: string, userName: string, todo: Todo, remindDays: number) {
    const relativeDays = relativeRemindDays(remindDays);
    const remindColor = LineMessageBuilder.getRemindColor(remindDays);
    const taskUrl = process.env.ENV === "local"
      ? todo.todoapp_reg_url
      : `${ process.env.HOST }/api/message/redirect/${ todo.id }/${ messageToken }`;
    const message: FlexMessage = {
      type: "flex",
      altText: `「${ todo.name }」の進捗はいかがですか？`,
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
                        { type: "span", text: `(${ formatDatetime(todo.deadline) })`, size: "sm" },
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
      text += `\n\n${ superior }さんに報告しておきますね💪`;
    }
    return { type: "text", text };
  }

  static createResponseToReplyInProgress(superior?: string): TextMessage {
    let text = "承知しました👍\n";
    if (superior) {
      text += `${ superior }さんに報告しておきますね💪\n\n`;
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
    const text = `${ superior }さん\n`
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

    let firstText = `${ user.name }さん、お疲れ様です！\nタスクの進捗をお尋ねします🙇`;
    if (superior) {
      firstText += `\nお答えいただいた内容を${ superior }さんにお伝えします！`;
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
                { type: "span", text: `が期日のタスク: ${ targetDueTodos.length }件` },
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
      altText: `現在、${ todos.length }件のタスクの担当者・期日が設定されていません😭`,
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
                    { type: "span", text: `${ todos.length }件のタスクの` },
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
      altText: `現在、${ todos.length }件のタスクの担当者が設定されていません😭`,
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
                    { type: "span", text: `${ todos.length }件のタスクの` },
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
      altText: `現在、${ todos.length }件のタスクの期日が設定されていません😭`,
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
                    { type: "span", text: `${ todos.length }件のタスクの` },
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
      text: `${ adminUser.name }さん\n`
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
      altText: `${ username }さんから「${ taskName }」の進捗共有がありました！`,
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
                        { type: "span", text: `(${ formatDatetime(deadline) })`, size: "sm" },
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
                    { type: "text", text: `${ username }さん`, color: "#666666", size: "md", flex: 4, wrap: true },
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

  static createActivateMessage(): TextMessage {
    return {
      type: "text",
      text: "遅延しているものは、本日中に期日を再設定しておきましょう🙋‍♀️",
    };
  }

  static async createDailyReportByCompany(
    users: User[],
    items: IDailyReportItems,
    response: INotionDailyReport[],
  ): Promise<FlexMessage> {
    const byCompany: FlexCarousel = { type: "carousel", contents: [] };
    const today = new Date();

    const message: FlexMessage = {
      type: "flex",
      altText: `${ today.getMonth() + 1 }月${ today.getDate() }日の日報です🙌`,
      contents: byCompany,
    };

    const MAX_DISPLAY_COUNT = 11;
    const getOperation = users.slice(0, MAX_DISPLAY_COUNT).map(async (user) => {
      const filteredRes = response.find((r) =>
        user.todoAppUsers.some((tu) => tu.user_app_id === r.assignee),
      );
      const pageUrl = filteredRes.docAppRegUrl;
      const profile = await lineBot.getProfile(user.lineId);
      return this.getDailyReportByUser(user, items, profile, pageUrl);
    });

    const remainingCount = users.length - MAX_DISPLAY_COUNT;
    if (remainingCount > 0) {
      const remainingBubble: FlexBubble = {
        type: "bubble",
        size: "kilo",
        body: {
          type: "box",
          layout: "vertical",
          contents: [
            { type: "text", text: "まだ紹介できていない", size: "sm", margin: "md", align: "center" },
            {
              type: "box",
              layout: "baseline",
              contents: [
                {
                  type: "text",
                  contents: [
                    { type: "span", text: `${ remainingCount }名`, size: "md", weight: "bold" },
                    { type: "span", text: "の日報があります🙌", size: "sm" },
                  ],
                  align: "center",
                },
              ],
            },
          ],
          justifyContent: "center",
        },
        footer: {
          type: "box",
          layout: "vertical",
          contents: [
            {
              type: "button",
              action: { type: "uri", label: "もっと見る", uri: "https://google.com" }, //TODO:データベースURLを入れる
              height: "md",
              style: "secondary",
              color: "#F6F6F6",
            },
          ],
        },
      };
      byCompany.contents = await Promise.all([...getOperation, Promise.resolve(remainingBubble)]);
    } else {
      byCompany.contents = await Promise.all(getOperation);
    }

    return message;
  }

  static getDailyReportByUser(
    user: User,
    items: IDailyReportItems,
    profile: Profile,
    pageUrl: string,
  ): FlexBubble {
    const completedYesterdayNumber = items.completedYesterday.filter(c => c.todoUsers.some(tu => tu.user_id === user.id)).length;
    const onGoingNumber = items.ongoing.filter(c => c.todoUsers.some(tu => tu.user_id === user.id)).length;
    const delayedTodos = items.delayed.filter(c => c.todoUsers.some(tu => tu.user_id === user.id));

    const reportByUser: FlexBubble = {
      type: "bubble",
      size: "kilo",
      hero: { type: "image", url: profile.pictureUrl, size: "md" },
      body: {
        type: "box",
        layout: "vertical",
        contents: [
          { type: "text", text: profile.displayName, weight: "bold", size: "lg", wrap: true, align: "center" },
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                contents: [
                  { type: "span", text: "昨日", size: "sm", color: "#666666" },
                  { type: "span", text: `${ completedYesterdayNumber }件`, weight: "bold" },
                ],
                align: "center",
              },
              {
                type: "text",
                contents: [
                  { type: "span", text: "本日", size: "sm", color: "#666666" },
                  { type: "span", text: `${ onGoingNumber }件`, weight: "bold" },
                ],
                align: "center",
              },
            ],
            margin: "md",
          },
          {
            type: "separator",
            margin: "md",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "くわしく見る", uri: pageUrl },
            style: "primary",
            color: "#06C755",
          },
        ],
      },
    };

    if (!delayedTodos.length && completedYesterdayNumber > 0) {
      reportByUser.body.contents.push({
        type: "text",
        text: PraiseMessage[Math.floor(Math.random() * GreetingMessage.length)],
        wrap: true,
        size: "xs",
        margin: "md",
      });
    }

    const MAX_DISPLAY_COUNT = 5;
    for (let i = 0; i < delayedTodos.length; i++) {
      if (i < MAX_DISPLAY_COUNT) {
        reportByUser.body.contents.push({
          type: "text",
          text: `🚨${ delayedTodos[i].name }`,
          size: "xs",
          color: "#666666",
          offsetTop: "md",
          action: { type: "uri", label: "タスクの詳細", uri: delayedTodos[i].todoapp_reg_url },
        });
      } else {
        const remainingCount = delayedTodos.length - MAX_DISPLAY_COUNT;
        reportByUser.body.contents.push({
          type: "text",
          text: `など、残り${ remainingCount }件が遅延しています👮‍♀️`,
          size: "xs",
          color: "#666666",
          margin: "lg",
        });
        break;
      }
    }
    return reportByUser;
  }

  static getRemindColor(remindDays: number): string {
    return remindDays > 0 ? Colors.alert : Colors.warning;
  }
}