import { TodoStatus } from "./common";
import { concatArrays } from "@/utils/common";

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

export type ReplyMessage<T extends ReplyMessageTypes = ReplyMessageTypes> = T & {
  label: string,
  primary: boolean,
  color: keyof typeof Colors,
};

type ReplyMessageTypes = ReplyMessagePostback | ReplyMessageUri;

export type ReplyMessagePostback = {
  type: "postback",
  status: TodoStatus,
  displayText: string,
}

export type ReplyMessageUri = {
  type: "uri",
}

export const replyMessagesBefore: ReplyMessage[] = [
  {
    type: "uri",
    label: "期日を変更する",
    primary: true,
    color: "normal",
  },
];

export const replyMessagesAfter: ReplyMessage[] = [
  {
    type: "postback",
    status: TodoStatus.DONE,
    label: "完了",
    displayText: "完了しました👍",
    primary: true,
    color: "normal",
  },
  {
    type: "uri",
    label: "期日を変更する",
    primary: true,
    color: "normal",
  },
];

export const replyMessages: ReplyMessage[] = replyMessagesBefore.concat(replyMessagesAfter);

const pickStatus = (messages: ReplyMessage[]): string[] => {
  return messages
    .filter(message => message.type === "postback")
    .map((message: ReplyMessage<ReplyMessagePostback>) => message.status);
};

export const messageData: string[] = pickStatus(concatArrays(replyMessagesBefore, replyMessagesAfter));

export const MessageAssets = {
  CHECK: "https://res.cloudinary.com/dbs5e9jve/image/upload/v1671105268/angel_materials/check_dark_in0ogu.png",
  ALERT: "https://res.cloudinary.com/dbs5e9jve/image/upload/v1671104878/angel_materials/alert_danger_kbb622.png",
};

export const REMIND_ME_COMMAND = "action_remind_me";