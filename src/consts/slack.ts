import { ProspectLevel, ReliefAction, TodoStatus } from "./common";

type ReplyAction = {
  status: TodoStatus;
  text: string;
  style?: "primary" | "danger";
};

type ActionItem = {
  text: string;
  value: number;
};

export const Icons = {
  CREATED: ":sparkles:",
  DONE: ":white_check_mark:",
  ASSIGNEE: ":busts_in_silhouette:",
  DEADLINE: ":calendar:"
};

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

export const prospects: ActionItem[] = [
  { text: ":sunny: 特に問題はない", value: ProspectLevel.VERY_GOOD },
  { text: ":mostly_sunny: 順調", value: ProspectLevel.GOOD },
  { text: ":partly_sunny: どちらとも言えない", value: ProspectLevel.NEUTRAL },
  { text: ":rain_cloud: 少し不安", value: ProspectLevel.BAD },
  { text: ":umbrella_with_rain_drops: 全然ダメ", value: ProspectLevel.VERY_BAD },
];

export const reliefActions: ActionItem[] = [
  { text: "作業手順", value: ReliefAction.SUBTASKS },
  { text: "担当者", value: ReliefAction.ASSIGNEES },
  { text: "期日", value: ReliefAction.DEADLINE },
  { text: "目的", value: ReliefAction.PURPOSE },
];

export const PROSPECT_PREFIX = "PROSPECT";
export const RELIEF_ACTION_PREFIX = "RELIEF_ACTION";
export const SEPARATOR = "__";
