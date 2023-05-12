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

export const NotionPropertyType = {
  TITLE: 1,
  NUMBER: 2,
  SELECT: 3,
  MULTI_SELECT: 4,
  URL: 5,
  STATUS: 6,
  PEOPLE: 7,
  DATE: 8,
  EMAIL: 9,
  PHONE_NUMBER: 10,
  CHECKBOX: 11,
  FILES: 12,
  RICH_TEXT: 13,
  FORMULA: 14,
  RELATION: 15,
  ROLLUP: 16,
  CREATED_BY: 17,
  CREATED_TIME: 18,
  LAST_EDITED_BY: 19,
  LAST_EDITED_TIME: 20,
};

export const UsageType = {
  TITLE: 1,
  SECTION: 2,
  ASSIGNEE: 3,
  DEADLINE: 4,
  IS_DONE: 5,
  IS_CLOSED: 6,
};

export const ChatToolId = {
  // LINE: 1,
  SLACK: 2,
};

export const TodoAppId = {
  // TRELLO: 1,
  // MICROSOFT: 2,
  NOTION: 3,
  BACKLOG: 4,
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
