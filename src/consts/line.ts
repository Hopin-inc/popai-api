import { TodoStatus } from "./common";

export const Colors: { [key: string]: string } = {
  normal: "#F5F5F5",
  warning: "#FBC02D",
  alert: "#F44336",
};

export const ButtonStylesByColor: { [key: keyof typeof Colors]: "primary" | "secondary" | "link" } = {
  normal: "secondary",
  warning: "secondary",
  alert: "primary",
};

export const WebhookEventType = {
  JOIN: "join",
  LEAVE: "leave",
  MEMBER_JOINED: "memberJoined",
  MEMBER_LEFT: "memberLeft",
  MESSAGE: "message",
  POSTBACK: "postback",
  FOLLOW: "follow",
  UN_FOLLOW: "unfollow",
  ACCOUNT_LINE: "accountLink",
};

export const WebhookSourceType = {
  GROUP: "group",
  USER: "user",
};

export type ReplyMessage = {
  status: TodoStatus,
  label: string,
  displayText: string,
  primary: boolean,
  color: keyof typeof Colors,
};

export const replyMessagesBefore: ReplyMessage[] = [
  {
    status: TodoStatus.ONGOING,
    label: "順調です✨️",
    displayText: "順調です✨️",
    primary: true,
    color: "normal",
  },
  {
    status: TodoStatus.NOT_YET,
    label: "あまり進んでいません😭",
    displayText: "あまり進んでいません😭",
    primary: true,
    color: "normal",
  },
  {
    status: TodoStatus.DONE,
    label: "完了👍",
    displayText: "完了しております👍",
    primary: false,
    color: "normal",
  },
  {
    status: TodoStatus.WITHDRAWN,
    label: "撤退しました",
    displayText: "撤退しました💧",
    primary: false,
    color: "alert",
  },
];

export const replyMessagesAfter: ReplyMessage[] = [
  {
    status: TodoStatus.DONE,
    label: "完了しました👍",
    displayText: "完了しました👍",
    primary: true,
    color: "normal",
  },
  {
    status: TodoStatus.DELAYED,
    label: "遅れております🙇‍♂️",
    displayText: "すみません、遅れております🙇‍♂️",
    primary: true,
    color: "normal",
  },
  {
    status: TodoStatus.WITHDRAWN,
    label: "撤退しました💧",
    displayText: "撤退しました💧",
    primary: true,
    color: "alert",
  },
];

export const replyMessages: ReplyMessage[] = replyMessagesBefore.concat(replyMessagesAfter);

const messageDataBefore: string[] = replyMessagesBefore.map(message => message.status);
const messageDataAfter: string[] = replyMessagesAfter.map(message => message.status);
export const messageData: string[] = messageDataBefore.concat(messageDataAfter);

export const MessageAssets = {
  CHECK: "https://res.cloudinary.com/dbs5e9jve/image/upload/v1671105268/angel_materials/check_dark_in0ogu.png",
  ALERT: "https://res.cloudinary.com/dbs5e9jve/image/upload/v1671104878/angel_materials/alert_danger_kbb622.png",
};

export const REMIND_ME_COMMAND = "action_remind_me";