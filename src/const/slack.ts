import { TodoStatus } from "./common";

type ReplyAction = {
  status: TodoStatus;
  text: string;
  style?: "primary" | "danger";
}

export const replyActionsBefore: ReplyAction[] = [
  {
    status: TodoStatus.DONE,
    text: "完了しております:+1:",
    style: "primary",
  },
  {
    status: TodoStatus.WITHDRAWN,
    text: "撤退しました:droplet:",
    style: "danger",
  },
  {
    status: TodoStatus.ONGOING,
    text: "順調です:sparkles:",
  },
  {
    status: TodoStatus.NOT_YET,
    text: "あまり進んでいません:sob:",
  },
];

export const replyActionsAfter: ReplyAction[] = [
  {
    status: TodoStatus.DONE,
    text: "完了しました:+1:",
    style: "primary",
  },
  {
    status: TodoStatus.WITHDRAWN,
    text: "撤退しました:droplet:",
  },
  {
    status: TodoStatus.DELAYED,
    text: "すみません、遅れております:bow:",
  },
];

export const replyActions: ReplyAction[] = replyActionsBefore.concat(replyActionsAfter);