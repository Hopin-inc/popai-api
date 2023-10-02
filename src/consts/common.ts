export const ChatToolId = {
  // LINE: 1,
  SLACK: 2,
  LINEWORKS: 3,
} as const;

export const TodoAppId = {
  // TRELLO: 1,
  // MICROSOFT: 2,
  NOTION: 3,
  BACKLOG: 4,
} as const;

export const ProjectRule = {
  PARENT_TODO: 1,
  CHILD_TODO: 2,
  MILESTONE: 3,
  SELECT: 4,
} as const;

export const AskType = {
  PROJECTS: 1,
  TODOS: 2,
} as const;

export const AskMode = {
  UNDEFINED: 0,
  FORWARD: 1,
  BACKWARD: 2,
} as const;

export const RemindType = {
  PROJECTS: 1,
  TODOS: 2,
} as const;

export const RemindMode = {
  UNDEFINED: 0,
  INITIAL: 1,
  AGAIN: 2,
} as const;

export const AllowedProjectRules = {
  [TodoAppId.NOTION]: [ProjectRule.PARENT_TODO, ProjectRule.CHILD_TODO, ProjectRule.SELECT],
  [TodoAppId.BACKLOG]: [ProjectRule.PARENT_TODO, ProjectRule.CHILD_TODO, ProjectRule.MILESTONE],
} as const;

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
  // CREATE | -------- | DELETE
  PROJECT: 3,
} as const;

export const ProjectHistoryProperty = TodoHistoryProperty;

export const HistoryAction = {
  CREATE: 1,
  MODIFIED: 2,
  DELETE: 3,
} as const;

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
} as const;

export const UsageType = {
  TITLE: 1,
  SECTION: 2,
  ASSIGNEE: 3,
  DEADLINE: 4,
  IS_DONE: 5,
  IS_CLOSED: 6,
  PARENT_TODO: 7,
  CHILD_TODO: 8,
} as const;

export const ProspectLevel = {
  VERY_GOOD: 5,
  GOOD: 4,
  NEUTRAL: 3,
  BAD: 2,
  VERY_BAD: 1,
} as const;

export const ReliefAction = {
  SUBTASKS: 1,
  ASSIGNEES: 2,
  DEADLINE: 3,
  PURPOSE: 4,
  OUTPUT: 5,
} as const;
