import { FlexBox, FlexBubble, FlexComponent, FlexMessage, Message, TextMessage } from "@line/bot-sdk";
import { getDate, sliceByNumber } from "../utils/common";
import {
  replyMessagesBefore,
  replyMessagesAfter,
  ReplyMessage,
  Colors, MessageAssets, ButtonStylesByColor,
} from "../const/common";
import { ITodo, ITodoLines, IUser } from "../types";

export class LineMessageBuilder {
  static createRemindMessage(messageToken: string, userName: string, todo: ITodo, remindDays: number) {
    const relativeDays = LineMessageBuilder.relativeRemindDays(remindDays);
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
                        { type: "span", text: `(${ getDate(todo.deadline) })`, size: "sm" },
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
        }
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

  static createReplyDoneMessage(superior?: string): TextMessage {
    let text = "完了しているんですね😌\n"
      + "お疲れさまでした！\n\n"
      + "担当いただき、ありがとうございます😊";
    if (superior) {
      text += `\n\n${ superior }さんに報告しておきますね💪`;
    }
    return { type: "text", text };
  }

  static createReplyInProgressMessage(superior?: string): TextMessage {
    let text = "承知しました👍\n";
    if (superior) {
      text += `${ superior }さんに報告しておきますね💪\n\n`;
    }
    text += "引き続きよろしくお願いします💪";
    return { type: "text", text };
  }

  static createDelayReplyMessage(): TextMessage {
    const text = "承知しました😖\n引き続きよろしくお願いします💪";
    return { type: "text", text };
  }

  static createProcessingJobReplyMessage(): TextMessage {
    const text = "処理中です。少々お待ちください。";
    return { type: "text", text };
  }

  static createWithdrawnReplyMessage(): TextMessage {
    const text = "そうなんですね！承知しました😊";
    return { type: "text", text };
  }

  static createStartReportToSuperiorMessage(superior: string): TextMessage {
    const text = `${ superior }さん\n`
      + "お疲れさまです🙌\n\n"
      + "タスクの進捗を聞いてきたので、ご報告いたします。";
    return { type: "text", text };
  }

  static createUnKnownMessage(): TextMessage {
    const text = "メッセージありがとうございます😊\n\n"
      + "申し訳ありませんが、こちらのアカウントから個別に返信することができません…\n"
      + "また何かありましたらお知らせしますね🙌";
    return { type: "text", text };
  }

  static createStartRemindMessageToUser(user: IUser, todoLines: ITodoLines[], superior?: string) {
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
      const relativeDays = LineMessageBuilder.relativeRemindDays(remindDays);
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

  static createListTaskMessageToAdmin(todos: ITodo[]): FlexMessage {
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
                }
              ],
              spacing: "xs",
            },
            {
              type: "box",
              layout: "vertical",
              contents: [],
            }
          ],
          spacing: "sm"
        }
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

  static createNotAssignListTaskMessageToAdmin(todos: ITodo[]): FlexMessage {
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
                }
              ],
              spacing: "xs",
            },
            {
              type: "box",
              layout: "vertical",
              contents: [],
            }
          ],
          spacing: "sm"
        }
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

  static createListTaskMessageToUser(todos: ITodo[]): FlexMessage {
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
                }
              ],
              spacing: "xs",
            },
            {
              type: "box",
              layout: "vertical",
              contents: [],
            }
          ],
          spacing: "sm"
        }
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

  static createNoListTaskMessageToAdmin(adminUser: IUser): TextMessage {
    return {
      type: "text",
      text: `${ adminUser.name }さん\n`
        + "お疲れ様です🙌\n\n"
        + "現在、次のタスクの担当者・期日が設定されていないタスクはありませんでした！\n"
        + "引き続きよろしくお願いします！",
    };
  }

  static createReportToSuperiorMessage(
    username: string,
    taskName: string,
    taskUrl: string,
    deadline: Date,
    content: string
  ): FlexMessage {
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
                        { type: "span", text: "あさって", weight: "bold", color: "#FFB300" },
                        { type: "span", text: `(${ getDate(deadline) })`, size: "sm" },
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

  static relativeRemindDays(remindDays: number): string {
    if (remindDays > 1) {
      return `${ remindDays.toString() }日前`;
    } else if (remindDays === 1) {
      return "昨日";
    } else if (remindDays === 0) {
      return "今日";
    } else if (remindDays === -1) {
      return "明日";
    } else if (remindDays === -2) {
      return "あさって";
    } else {
      return `${ (-remindDays).toString() }日後`;
    }
  }

  static getRemindColor(remindDays: number): string {
    return remindDays > 0 ? Colors.alert : Colors.warning;
  }
}
