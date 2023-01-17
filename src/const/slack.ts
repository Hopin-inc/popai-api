import { TodoStatus } from "./common";

type ReplyAction = {
  status: TodoStatus;
  text: string;
  style: "default" | "primary" | "danger";
}

export const replyActionsBefore: ReplyAction[] = [
  {
    status: TodoStatus.DONE,
    text: "完了しております👍",
    style: "primary",
  },
  {
    status: TodoStatus.WITHDRAWN,
    text: "撤退しました💧",
    style: "danger",
  },
  {
    status: TodoStatus.ONGOING,
    text: "順調です✨️",
    style: "default",
  },
  {
    status: TodoStatus.NOT_YET,
    text: "あまり進んでいません😭",
    style: "default",
  },
];

export const replyActionsAfter: ReplyAction[] = [
  {
    status: TodoStatus.DONE,
    text: "完了しました👍",
    style: "primary",
  },
  {
    status: TodoStatus.WITHDRAWN,
    text: "撤退しました💧",
    style: "default",
  },
  {
    status: TodoStatus.DELAYED,
    text: "すみません、遅れております🙇‍♂️",
    style: "default",
  },
];

export const replyActions: ReplyAction[] = replyActionsBefore.concat(replyActionsAfter);