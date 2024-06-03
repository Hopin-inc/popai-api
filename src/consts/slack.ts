import { ProspectLevel, ReliefAction } from "./common";

export type ActionItemWithEmoji = ActionItem & {
  emoji: string;
}

type ActionItem = {
  text: string;
  value: number;
  level1?: boolean;
  level2?: boolean;
  level3?: boolean;
  level4?: boolean;
  level5?: boolean;
}

export const prospects: ActionItemWithEmoji[] = [
  { text: "特に問題はない", value: ProspectLevel.VERY_GOOD, emoji: ":sunny:",  level1: true },
  { text: "まあまあ順調", value: ProspectLevel.GOOD, emoji: ":mostly_sunny:", level2: true },
  { text: "どちらとも言えない", value: ProspectLevel.NEUTRAL, emoji: ":partly_sunny:", level3: true },
  { text: "少し不安", value: ProspectLevel.BAD, emoji: ":rain_cloud:", level4: true },
  { text: "全然ダメ", value: ProspectLevel.VERY_BAD, emoji: ":umbrella_with_rain_drops:", level5: true },
];

export const reliefActions: ActionItem[] = [
  { text: "作業手順", value: ReliefAction.SUBTASKS },
  { text: "成果物", value: ReliefAction.OUTPUT },
  { text: "担当者", value: ReliefAction.ASSIGNEES },
  { text: "期日", value: ReliefAction.DEADLINE },
  { text: "目的", value: ReliefAction.PURPOSE },
];

export const SlackActionLabel = {
  REMIND: "REMIND",
  PROSPECT: "PROSPECT",
  RELIEF_ACTION: "RELIEF_ACTION",
  OPEN_RELIEF_COMMENT_MODAL: "OPEN_RELIEF_COMMENT",
  OPEN_ASK_MODAL: "OPEN_ASK",
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

export const REMIND_MAX_ITEMS = 3;
export const REMIND_MAX_ALERT_ITEMS = 10;
