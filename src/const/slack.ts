import { TodoStatus } from "./common";

type ReplyAction = {
  status: TodoStatus;
  text: string;
  style?: "primary" | "danger";
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
  },
  {
    status: TodoStatus.NOT_YET,
    text: "あまり進んでいません😭",
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
  },
  {
    status: TodoStatus.DELAYED,
    text: "すみません、遅れております🙇",
  },
];

export const replyActions: ReplyAction[] = replyActionsBefore.concat(replyActionsAfter);