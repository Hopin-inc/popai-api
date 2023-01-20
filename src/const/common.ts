export const Common = {
  day_remind: 1,
  trello: 'trello',
  microsoft: 'microsoft',
  notion: "notion",
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
  RESPONSE: 6
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
  OPENNED: true,
  CLOSED: false,
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

export const Colors: { [key: string]: string } = {
  normal: '#F5F5F5',
  warning: '#FBC02D',
  alert: '#F44336',
}

export const ButtonStylesByColor: { [key: keyof typeof Colors]: "primary" | "secondary" | "link" } = {
  normal: 'secondary',
  warning: 'secondary',
  alert: 'primary',
}

export enum TodoStatus {
  DONE = "STATUS_DONE",
  DELAYED = "STATUS_DELAYED",
  ONGOING = "STATUS_ONGOING",
  NOT_YET = "STATUS_NOT_YET",
  WITHDRAWN = "STATUS_WITHDRAWN",
}

export type ReplyMessage = {
  status: TodoStatus,
  label: string,
  displayText: string,
  primary: boolean,
  color: keyof typeof Colors,
};

export const replyMessagesBefore: ReplyMessage[] = [
  {
    status: TodoStatus.ONGOING,
    label: "順調です✨️",
    displayText: "順調です✨️",
    primary: true,
    color: "normal",
  },
  {
    status: TodoStatus.NOT_YET,
    label: "あまり進んでいません😭",
    displayText: "あまり進んでいません😭",
    primary: true,
    color: "normal",
  },
  {
    status: TodoStatus.DONE,
    label: "完了👍",
    displayText: "完了しております👍",
    primary: false,
    color: "normal",
  },
  {
    status: TodoStatus.WITHDRAWN,
    label: "撤退しました",
    displayText: "撤退しました💧",
    primary: false,
    color: "alert",
  },
];

export const replyMessagesAfter: ReplyMessage[] = [
  {
    status: TodoStatus.DONE,
    label: "完了しました👍",
    displayText: "完了しました👍",
    primary: true,
    color: "normal",
  },
  {
    status: TodoStatus.DELAYED,
    label: "遅れております🙇‍♂️",
    displayText: "すみません、遅れております🙇‍♂️",
    primary: true,
    color: "normal",
  },
  {
    status: TodoStatus.WITHDRAWN,
    label: "撤退しました💧",
    displayText: "撤退しました💧",
    primary: true,
    color: "alert",
  },
];

export const relativeRemindDays = (remindDays: number): string => {
  if (remindDays > 1) {
    return `${ remindDays.toString() }日前`;
  } else if (remindDays === 1) {
    return '昨日';
  } else if (remindDays === 0) {
    return '今日';
  } else if (remindDays === -1) {
    return '明日';
  } else if (remindDays === -2) {
    return 'あさって';
  } else {
    return `${ (-remindDays).toString() }日後`;
  }
}

export const replyMessages: ReplyMessage[] = replyMessagesBefore.concat(replyMessagesAfter);

const messageDataBefore: string[] = replyMessagesBefore.map(message => message.status);
const messageDataAfter: string[] = replyMessagesAfter.map(message => message.status);
export const messageData: string[] = messageDataBefore.concat(messageDataAfter);

export const MessageAssets = {
  CHECK: "https://res.cloudinary.com/dbs5e9jve/image/upload/v1671105268/angel_materials/check_dark_in0ogu.png",
  ALERT: "https://res.cloudinary.com/dbs5e9jve/image/upload/v1671104878/angel_materials/alert_danger_kbb622.png",
}

export const REMIND_ME_COMMAND = 'action_remind_me';
export const LINE_MAX_LABEL_LENGTH = 40;
