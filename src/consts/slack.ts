import { ProspectLevel, ReliefAction, TodoStatus } from "./common";

type ReplyAction = {
  status: TodoStatus;
  text: string;
  style?: "primary" | "danger";
};

type ActionItemWithEmoji = ActionItem & {
  emoji: string;
}

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

export const prospects: ActionItemWithEmoji[] = [
  { text: "特に問題はない", value: ProspectLevel.VERY_GOOD, emoji: ":sunny:" },
  { text: "まあまあ順調", value: ProspectLevel.GOOD, emoji: ":mostly_sunny:" },
  { text: "どちらとも言えない", value: ProspectLevel.NEUTRAL, emoji: ":partly_sunny:" },
  { text: "少し不安", value: ProspectLevel.BAD, emoji: ":rain_cloud:" },
  { text: "全然ダメ", value: ProspectLevel.VERY_BAD, emoji: ":umbrella_with_rain_drops:" },
];

export const reliefActions: ActionItem[] = [
  { text: "作業手順", value: ReliefAction.SUBTASKS },
  { text: "成果物", value: ReliefAction.OUTPUT },
  { text: "担当者", value: ReliefAction.ASSIGNEES },
  { text: "期日", value: ReliefAction.DEADLINE },
  { text: "目的", value: ReliefAction.PURPOSE },
];

export const DEFAULT_BULLET = "   • ";

export const SlackActionLabel = {
  PROSPECT: "PROSPECT",
  RELIEF_ACTION: "RELIEF_ACTION",
  OPEN_RELIEF_COMMENT_MODAL: "OPEN_RELIEF_COMMENT",
  OPEN_PLAN_MODAL: "OPEN_PLAN",
};
export const SEPARATOR = "__";
export const SlackModalLabel = {
  RELIEF_COMMENT: "SUBMIT_RELIEF_COMMENT",
  PLAN: "SUBMIT_PLAN",
};
export const ReliefCommentModalItems = {
  COMMENT: "COMMENT",
};
export const AskPlanModalItems = {
  TODOS: "TODOS",
};
