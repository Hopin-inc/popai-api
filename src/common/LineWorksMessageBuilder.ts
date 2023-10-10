import "dayjs/locale/ja";

import dayjs from "dayjs";

import Project from "@/entities/transactions/Project";
import Todo from "@/entities/transactions/Todo";
import { diffDays, formatDatetime, toJapanDateTime } from "@/utils/datetime";
import { relativeRemindDays } from "@/utils/string";
import User from "@/entities/settings/User";
import { LineWorksContent } from "@/types/lineworks";

dayjs.locale("ja");

export default class LineWorksMessageBuilder {
  private static getDeadlineText(deadline: Date): string {
    const remindDays = deadline
      ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date()))
      : null;
    return deadline ? `${ relativeRemindDays(remindDays) } (${ formatDatetime(deadline) })` : "未設定";
  }

  public static createPublicRemind<T extends Project | Todo>(items: T[]) {
    const content = this.remindMessage([
      ...this.remindContent,
      ...this.getContentPublicRemind(items),
    ]);
    return { content };
  }

  public static createPersonalRemind<T extends Project | Todo>(items: T[]) {
    const content = this.remindMessage([
      ...this.remindContent,
      ...this.getContentPersonalRemind(items),
    ]);
    return { content };
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

  private static separatorContent(title: boolean ) {
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
    const itemTitle = item.appUrl ? `<${ item.appUrl }|${ item.name }>` : item.name;
    
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
        {
          text: "･･･",
          type: "text",
          color: "#9E9E9E",
          size: "sm",
          flex: 0,
          gravity: "center",
          contents: [],
          action: item.appUrl
            ? {
                type: "uri",
                uri: item.appUrl,
              }
            : undefined,
        },
      ],
    };
  }

  private static getPersonalRemind<T extends Todo | Project>(item: T): LineWorksContent {
    const itemTitle = item.appUrl ? `<${ item.appUrl }|${ item.name }>` : item.name;

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
        {
          text: "･･･",
          type: "text",
          color: "#9E9E9E",
          size: "sm",
          flex: 0,
          gravity: "center",
          contents: [],
          action: item.appUrl
            ? {
                type: "uri",
                uri: item.appUrl,
              }
            : undefined,
        },
      ],
    };
  }

  private static getUserName(users: User[]): string {
    let userName = "";
    users.map(user => {
      userName += userName.length ? "、" : "" + user.name + "さん";
    });
    return userName;
  }
}
