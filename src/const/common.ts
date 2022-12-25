export const Common = {
  day_remind: 1,
  trello: 'trello',
  microsoft: 'microsoft',
  completed: 100,
  microsoftBaseUrl: 'https://tasks.office.com/{tenant}/Home/Task',
  remindMaxCount: 2,
};

export const MessageType = {
  TEXT: 1,
  STICKER: 2,
  IMAGE: 3,
  VIDEO: 4,
  AUDIO: 5,
  LOCATION: 6,
  IMAMEMAP: 7,
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
  FROM_USER: 1,
  FROM_BOT: 0,
};

export const ReplyStatus = {
  REPLIED: 1,
  NOT_REPLIED: 0,
};

export const OpenStatus = {
  OPENNED: 1,
  CLOSED: 0,
};

export const ChatToolCode = {
  LINE: 'line',
  SLACK: 'slack',
};

export const LineMessageQueueStatus = {
  NOT_SEND: 0,
  WAITING_REPLY: 1,
  REPLIED: 2,
  NOT_SEND_TIMEOUT: 3,
  NOT_REPLY_TIMEOUT: 4,
};

export const RemindUserJobStatus = {
  NOT_STARTED: 0,
  PROCESSING: 1,
  DONE: 2,
  ERROR: 99,
};

export const RemindUserJobResult = {
  OK: 0,
  FAILED_HAS_PROCESSING_JOB: 1,
  FAILED_OTHER: 2,
};

export const DONE_MESSAGE = '完了しております👍';
export const DELAY_MESSAGE = 'すみません、遅れております🙇‍♂️';
export const PROGRESS_GOOD_MESSAGE = '順調です✨️';
export const PROGRESS_BAD_MESSAGE = 'あまり進んでいません😭';
export const WITHDRAWN_MESSAGE = '撤退しました💧';
export const CHANGE_MESSAGE = '変更する';
export const REMIND_ME_COMMAND = 'action_remind_me';
export const LINE_MAX_LABEL_LENGTH = 40;
