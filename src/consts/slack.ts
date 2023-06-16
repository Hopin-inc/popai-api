import { ProspectLevel, ReliefAction } from "./common";

type ActionItemWithEmoji = ActionItem & {
  emoji: string;
}

type ActionItem = {
  text: string;
  value: number;
};

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

export const RemindMaxItems = 3;
export const RemindMessage = {
  type: "section",
  text: {
    type: "mrkdwn",
    text: "遅延しているタスクの期日を再設定しましょう😖",
  },
};
export const RemindContext = {
  type: "context",
  elements: [
    { type: "image", image_url: "https://cdn-icons-png.flaticon.com/512/2556/2556974.png", alt_text: "alert" },
    { type: "mrkdwn", text: "疑問や不安があれば、関係者に聞こう" },
  ],
};