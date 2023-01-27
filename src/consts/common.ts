export const Common = {
  remindMaxCount: 2,
};
export const MAX_REMIND_COUNT = 2;

export const TodoHistoryProperty = {
  NAME: 1,
  DEADLINE: 2,
  ASSIGNEE: 3,
  IS_DONE: 4,
  IS_CLOSED: 5,
  IS_DELAYED: 6,
  IS_RECOVERED: 7,
};

export const TodoHistoryAction = {
  CREATE: 1,
  USER_CHANGE: 2,
  SYSTEM_CHANGE: 3,
  DELETE: 4,
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
  BATCH: 1,
  REPLY: 2,
  MANUAL: 3,
  ACTION: 4,
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
