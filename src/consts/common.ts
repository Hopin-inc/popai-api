export const MAX_REMIND_COUNT = 2;

export const NOT_UPDATED_DAYS = 5;

export const TodoHistoryProperty = {
  // CREATE | MODIFIED | ------
  NAME: 1,
  // CREATE | MODIFIED | DELETE
  DEADLINE: 2,
  // CREATE | -------- | DELETE
  ASSIGNEE: 3,
  // CREATE | -------- | DELETE
  IS_DONE: 4,
  // CREATE | -------- | DELETE
  IS_CLOSED: 5,
  // CREATE | -------- | DELETE
  IS_DELAYED: 6,
  // CREATE | -------- | DELETE
  IS_RECOVERED: 7,
};

export const TodoHistoryAction = {
  CREATE: 1,
  MODIFIED: 2,
  DELETE: 3,
};

export const MessageType = {
  TEXT: 1,
  STICKER: 2,
  IMAGE: 3,
  VIDEO: 4,
  AUDIO: 5,
  LOCATION: 6,
  IMAGE_MAP: 7,
  TEMPLATE: 8,
  FLEX: 9,
};

export const MessageTriggerType = {
  REMIND: 1,
  REPLY: 2,
  MANUAL: 3,
  REPORT: 4,
  PRAISE: 5,
  RESPONSE: 6,
  NOTIFY: 7,
  DAILY_REPORT: 8,
};

export const RemindType = {
  NOT_REMIND: 0,
  REMIND_BY_DEADLINE: 1,
  REMIND_NOT_ASSIGN: 2,
  REMIND_NOT_DEADLINE: 3,
  REMIND_NOT_ASSIGN_DEADLINE: 4,
};

export const SenderType = {
  FROM_USER: true,
  FROM_BOT: false,
};

export const ReplyStatus = {
  REPLIED: true,
  NOT_REPLIED: false,
};

export const OpenStatus = {
  OPENED: true,
  CLOSED: false,
};

export const ChatToolCode = {
  LINE: "line",
  SLACK: "slack",
};

export const TodoAppCode = {
  TRELLO: "trello",
  MICROSOFT: "microsoft",
  NOTION: "notion",
};

export const LineMessageQueueStatus = {
  WAITING: 0,
  UNREPLIED: 1,
  REPLIED: 2,
  TIMEOUT_NOT_SENT: 3,
  TIMEOUT_NO_REPLY: 4,
};

export const RemindUserJobStatus = {
  WAITING: 0,
  PROCESSING: 1,
  DONE: 2,
  ERROR: 99,
};

export const RemindUserJobResult = {
  OK: 0,
  FAILED_WITH_PROCESSING_JOB: 1,
  FAILED_OTHER: 2,
};

export enum TodoStatus {
  DONE = "STATUS_DONE",
  DELAYED = "STATUS_DELAYED",
  ONGOING = "STATUS_ONGOING",
  NOT_YET = "STATUS_NOT_YET",
  WITHDRAWN = "STATUS_WITHDRAWN",
}

export const EventType = {
  NOTIFY_ON_UPDATE: 1,
  DAILY_REPORT: 2,
  ASK_PROSPECTS: 3,
};

export const ProspectLevel = {
  VERY_GOOD: 5,
  GOOD: 4,
  NEUTRAL: 3,
  BAD: 2,
  VERY_BAD: 1,
};

export const ReliefAction = {
  SUBTASKS: 1,
  ASSIGNEES: 2,
  DEADLINE: 3,
  PURPOSE: 4,
  OUTPUT: 5,
};
