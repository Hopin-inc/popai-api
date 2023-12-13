import "dayjs/locale/ja";

import dayjs from "dayjs";

import Project from "@/entities/transactions/Project";
import Todo from "@/entities/transactions/Todo";
import { diffDays, formatDatetime, toJapanDateTime } from "@/utils/datetime";
import { relativeRemindDays } from "@/utils/string";
import User from "@/entities/settings/User";
import { LineWorksContent } from "@/types/lineworks";
import { ITodoDoneUpdate } from "@/types";

dayjs.locale("ja");

const REMIND_TODOS_LIMIT = 20;

export default class LineWorksMessageBuilder {
  private static getDeadlineText(deadline: Date): string {
    const remindDays = deadline
      ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date()))
      : null;
    return deadline ? `${ relativeRemindDays(remindDays) } (${ formatDatetime(deadline) })` : "未設定";
  }

  public static createPublicRemind<T extends Project | Todo>(items: T[]) {
    const truncatedItems = items.slice(0, REMIND_TODOS_LIMIT);
    const messageContents: LineWorksContent[] = [
      ...this.remindContent,
      ...this.getContentPublicRemind(truncatedItems),
    ];
    if (items.length > REMIND_TODOS_LIMIT) {
      messageContents.push(...this.insertMore(items.length));
    }
    const content = this.remindMessage(messageContents);
    return { content };
  }

  public static createPersonalRemind<T extends Project | Todo>(items: T[]) {
    const truncatedItems = items.slice(0, REMIND_TODOS_LIMIT);
    const messageContents: LineWorksContent[] = [
      ...this.remindContent,
      ...this.getContentPersonalRemind(truncatedItems),
    ];
    if (items.length > REMIND_TODOS_LIMIT) {
      messageContents.push(...this.insertMore(items.length));
    }
    const content = this.remindMessage(messageContents);
    return { content };
  }

  public static createTodoDoneUpdated<T extends ITodoDoneUpdate>(item: T) {
    const content = {
      content: {
        type: "flex",
        altText: "タスクが完了されました。",
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                layout: "baseline",
                type: "box",
                contents: [
                  {
                    url: "https://api-private.atlassian.com/users/8503d03a5475ea62f006ea0d1f605b92/avatar",
                    type: "icon",
                    size: "lg",
                  },
                  {
                    type: "text",
                    size: "md",
                    contents: [
                      {
                        text: `${ item.users.map(user => user.name).join("、") }`,
                        type: "span",
                        weight: "bold",
                      },
                      {
                        text: "さんが",
                        type: "span",
                      },
                    ],
                    color: "#424242",
                  },
                ],
                spacing: "sm",
              },
              {
                text: `${ item.todo?.name || item.project?.name }`,
                type: "text",
                weight: "bold",
                size: "lg",
                color: "#424242",
              },
              {
                text: "を完了しました！",
                type: "text",
                size: "md",
                color: "#424242",
              },
              {
                layout: "baseline",
                action: {
                  type: "uri",
                  label: "内容を確認する",
                  uri: `${ item.todo?.appUrl || item.project?.appUrl }`,
                },
                type: "box",
                cornerRadius: "sm",
                contents: [
                  {
                    text: "内容を確認する",
                    type: "text",
                    flex: 1,
                    size: "sm",
                    align: "center",
                    color: "#9E9E9E",
                  },
                ],
                borderColor: "#9E9E9E",
                borderWidth: "normal",
                margin: "md",
                flex: 0,
                width: "112px",
              },
            ],
          },
        },
      },
    };
    return content;
  }

  private static remindMessage(contents: LineWorksContent[]): LineWorksContent {
    return {
      type: "flex",
      altText: "次のタスクが期限切れになっています。",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          contents: [...contents],
        },
      },
    };
  }

  private static insertMore(length: number) {
    return [{
      text: `ほか${ length - REMIND_TODOS_LIMIT }件`,
      type: "text",
      size: "md",
      color: "#424242",
      wrap: true,
    }];
  }

  private static readonly remindContent = [
    {
      text: "次のタスクが期限切れになっています。",
      type: "text",
      size: "md",
      color: "#424242",
      wrap: true,
    },
    {
      text: "期日の再設定をお願いします🙏",
      type: "text",
      size: "md",
      wrap: true,
      color: "#424242",
    },
  ];

  private static separatorContent(title: boolean) {
    return {
      type: "separator",
      margin: title ? "xl" : undefined,
    };
  }

  private static getContentPublicRemind<T extends Todo | Project>(items: T[]): LineWorksContent[] {
    const contentPublic = [];
    items.map((item) => {
      contentPublic.push(this.separatorContent(contentPublic.length == 0));
      contentPublic.push(this.getPublicRemind(item));
    });
    return contentPublic;
  }

  private static getContentPersonalRemind<T extends Todo | Project>(items: T[]): LineWorksContent[] {
    const contentPersonal = [];
    items.map((item) => {
      contentPersonal.push(this.separatorContent(contentPersonal.length == 0));
      contentPersonal.push(this.getPersonalRemind(item));
    });
    return contentPersonal;
  }

  private static getPublicRemind<T extends Todo | Project>(item: T): LineWorksContent {
    const itemTitle = item.name ?? item.appUrl ?? "N/A";

    return {
      layout: "horizontal",
      type: "box",
      contents: [
        {
          layout: "vertical",
          type: "box",
          contents: [
            {
              text: itemTitle,
              type: "text",
              size: "md",
              color: "#424242",
              wrap: true,
              weight: "bold",
            },
            ...(item.users.length ? [{
              layout: "baseline",
              type: "box",
              contents: [
                {
                  url: "https://api-private.atlassian.com/users/8503d03a5475ea62f006ea0d1f605b92/avatar", // TODO: Avoid hard coding.
                  type: "icon",
                  size: "md",
                },
                {
                  type: "text",
                  size: "sm",
                  contents: [],
                  color: "#9E9E9E",
                  text: this.getUserName(item.users),
                  offsetTop: "-3px",
                },
              ],
              spacing: "sm",
              offsetTop: "2px",
            }] : []),
            {
              type: "text",
              size: "sm",
              color: "#9E9E9E",
              wrap: true,
              weight: "regular",
              contents: [
                {
                  text: "期日: ",
                  type: "span",
                },
                {
                  text: this.getDeadlineText(item.deadline),
                  type: "span",
                  weight: "bold",
                },
              ],
            },
          ],
          paddingTop: "8px",
          paddingBottom: "8px",
          flex: 1,
        },
        // {  // TODO: Reactivate this when google-spreadsheets is built on.
        //   text: "･･･",
        //   type: "text",
        //   color: "#9E9E9E",
        //   size: "sm",
        //   flex: 0,
        //   gravity: "center",
        //   contents: [],
        //   action: item.appUrl
        //     ? {
        //       type: "uri",
        //       uri: item.appUrl,
        //     }
        //     : undefined,
        // },
      ],
    };
  }

  private static getPersonalRemind<T extends Todo | Project>(item: T): LineWorksContent {
    const itemTitle = item.name ?? item.appUrl ?? "N/A";

    return {
      layout: "horizontal",
      type: "box",
      contents: [
        {
          layout: "vertical",
          type: "box",
          contents: [
            {
              text: itemTitle,
              type: "text",
              size: "md",
              color: "#424242",
              wrap: true,
              weight: "bold",
            },
            {
              type: "text",
              size: "sm",
              color: "#9E9E9E",
              wrap: true,
              weight: "regular",
              contents: [
                {
                  text: "期日: ",
                  type: "span",
                },
                {
                  text: this.getDeadlineText(item.deadline),
                  type: "span",
                  weight: "bold",
                },
              ],
            },
          ],
          paddingTop: "8px",
          paddingBottom: "8px",
          flex: 1,
        },
        // {  // TODO: Reactivate this when google-spreadsheets is built on.
        // {
        //   text: "･･･",
        //   type: "text",
        //   color: "#9E9E9E",
        //   size: "sm",
        //   flex: 0,
        //   gravity: "center",
        //   contents: [],
        //   action: item.appUrl
        //     ? {
        //       type: "uri",
        //       uri: item.appUrl,
        //     }
        //     : undefined,
        // },
      ],
    };
  }

  private static getUserName(users: User[]): string {
    if (!users.length) {
      return "";
    } else {
      return users
        .filter(user => user?.name)
        .map(user => `${ user?.name }さん`)
        .join("、");
    }
  }
}
