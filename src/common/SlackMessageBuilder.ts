import dayjs from "dayjs";
import "dayjs/locale/ja";

import { Button, KnownBlock, MessageAttachment } from "@slack/web-api";

import Todo from "@/entities/Todo";
import User from "@/entities/User";

import {
  Icons,
  PROSPECT_PREFIX,
  prospects, RELIEF_ACTION_PREFIX,
  reliefActions,
  replyActionsAfter,
  replyActionsBefore,
  SEPARATOR
} from "@/consts/slack";
import { diffDays, formatDatetime, relativeRemindDays, toJapanDateTime } from "@/utils/common";
import { ITodoSlack } from "@/types/slack";
import { IDailyReportItems, valueOf } from "@/types";
import { NOT_UPDATED_DAYS, ProspectLevel, TodoHistoryAction } from "@/consts/common";
import Section from "@/entities/Section";

dayjs.locale("ja");

export default class SlackMessageBuilder {
  static createRemindMessage(user: User, todo: Todo, remindDays: number) {
    const relativeDays = relativeRemindDays(remindDays);
    const actions = remindDays > 0 ? replyActionsAfter : replyActionsBefore;
    const blocks: KnownBlock[] = [
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*タスク:*\n<${ todo.todoapp_reg_url }|${ todo.name }>`,
          },
          {
            type: "mrkdwn",
            text: `*期日:*\n${ relativeDays }`,
          },
        ],
      },
      {
        type: "actions",
        elements: actions.map(action => {
          return {
            type: "button",
            text: { type: "plain_text", emoji: true, text: action.text },
            style: action.style,
            value: action.status,
          };
        }),
      },
    ];
    return { blocks };
  }

  static createReplaceMessageAfterReply(userId: string, todo: Todo, message: string) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${ todo.todoapp_reg_url }|${ todo.name }>は *${ message }* で伝えました`,
        },
      },
    ];
    return { blocks };
  }

  static createShareMessage(userId: string, todo: Todo, message: string) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*タスク:*\n<${ todo.todoapp_reg_url }|${ todo.name }>`,
          },
          {
            type: "mrkdwn",
            text: `*期日:*\n${ dayjs(todo.deadline).format("M月D日(ddd)") }`,
          },
          {
            type: "mrkdwn",
            text: `*進捗:*\n${ message }`,
          },
          {
            type: "mrkdwn",
            text: `*回答者:*\n<@${ userId }>`,
          },
        ],
      },
    ];
    return { blocks };
  }

  static createBeforeRemindMessage(user: User, todoSlacks: ITodoSlack[]) {
    const sortedTodoSlacks = todoSlacks.sort((a, b) => (a.remindDays < b.remindDays ? 1 : -1));

    const groupMessageMap = new Map<number, ITodoSlack[]>();
    sortedTodoSlacks.forEach((item) => {
      if (groupMessageMap.has(item.remindDays)) {
        groupMessageMap.get(item.remindDays).push(item);
      } else {
        groupMessageMap.set(item.remindDays, [item]);
      }
    });

    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: "お仕事お疲れさまです:raised_hands:\n下記の進捗はいかがですか？" },
      },
    ];

    return { blocks };
  }

  static createNotifyUnsetMessage(adminUser: User, todos: Todo[]) {
    const todoList = todos.map(todo => `:bookmark: <${ todo.todoapp_reg_url }|${ todo.name }>`);
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "お疲れさまです:raised_hands:\n"
            + "現在、次のタスクの担当者と期日が設定されていません:sob:\n\n"
            + todoList.join("\n"),
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: "ご確認をお願いします:pray:" },
      },
    ];
    return { blocks };
  }

  static createNotifyUnassignedMessage(adminUser: User, todos: Todo[]) {
    const todoList = todos.map(todo => `:bookmark: <${ todo.todoapp_reg_url }|${ todo.name }>`);
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "お疲れさまです:raised_hands:\n"
            + "現在、次のタスクの担当者が設定されていません:sob:\n\n"
            + todoList.join("\n"),
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: "ご確認をお願いします:pray:" },
      },
    ];
    return { blocks };
  }

  static createNotifyNoDeadlineMessage(user: User, todos: Todo[]) {
    const todoList = todos.map(todo => `:bookmark: <${ todo.todoapp_reg_url }|${ todo.name }>`);
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${ user.slackId }> お疲れさまです:raised_hands:\n`
            + "現在、次のタスクの期日が設定されていません:sob:\n\n"
            + todoList.join("\n"),
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: "ご確認をお願いします:pray:" },
      },
    ];
    return { blocks };
  }

  static createNotifyNothingMessage() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "お疲れさまです:raised_hands:\n"
            + "現在、担当者・期日が設定されていないタスクはありませんでした。",
        },
      },
    ];
    return { blocks };
  }

  static createNotifyOnCreatedMessage(todo: Todo, assignees: User[]) {
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: `${ Icons.CREATED } タスクが追加されました。` },
    }];
    const attachments: MessageAttachment[] = [this.createTodoAttachment(todo, assignees)];
    return { blocks, attachments };
  }

  static createNotifyOnCompletedMessage(todo: Todo) {
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: `${ Icons.DONE } タスクを完了しました。` },
    }];
    const attachments: MessageAttachment[] = [this.createTodoAttachment(todo)];
    return { blocks, attachments };
  }

  private static createTodoAttachment(
    todo: Todo,
    assignees: User[] = todo.users,
    color: string = "good"
  ): MessageAttachment {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*<${ todo.todoapp_reg_url }|${ todo.name }>*` },
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `${ Icons.ASSIGNEE } ${ this.getAssigneesText(assignees) }` },
          { type: "mrkdwn", text: `${ Icons.DEADLINE } ${ this.getDeadlineText(todo.deadline) }` },
        ]
      },
    ];
    return { blocks, color };
  }

  static createNotifyOnAssigneeUpdatedMessage(
    todo: Todo,
    action: valueOf<typeof TodoHistoryAction>,
    assignees: User[],
  ) {
    const message = action === TodoHistoryAction.CREATE ? `${ Icons.ASSIGNEE } 担当者が設定されました。`
      : action === TodoHistoryAction.DELETE ? `${ Icons.ASSIGNEE } 担当者が削除されました。`
        : `${ Icons.ASSIGNEE } 担当者が変更されました。`;
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: message },
    }];
    const attachmentBlocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*<${ todo.todoapp_reg_url }|${ todo.name }>*` },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `~${ this.getAssigneesText(todo.users) }~ → *${ this.getAssigneesText(assignees) }*`,
        },
      },
    ];
    const attachments: MessageAttachment[] = [{ color: "good", blocks: attachmentBlocks }];
    return { blocks, attachments };
  }

  static createNotifyOnDeadlineUpdatedMessage(todo: Todo, action: valueOf<typeof TodoHistoryAction>, deadline: Date) {
    const message = action === TodoHistoryAction.CREATE ? `${ Icons.DEADLINE } 期日が設定されました。`
      : action === TodoHistoryAction.DELETE ? `${ Icons.DEADLINE } 期日が削除されました。`
        : `${ Icons.DEADLINE } 期日が変更されました。`;
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: message },
    }];
    const attachmentBlocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*<${ todo.todoapp_reg_url }|${ todo.name }>*` },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `~${ this.getDeadlineText(todo.deadline) }~ → *${ this.getDeadlineText(deadline) }*`,
        },
      },
    ];
    const attachments: MessageAttachment[] = [{ color: "good", blocks: attachmentBlocks }];
    return { blocks, attachments };
  }

  private static getAssigneesText(assignees: User[]): string {
    return assignees?.length ? assignees.map(user => user.name).join(", ") : "未設定";
  }

  private static getDeadlineText(deadline: Date): string {
    const remindDays = deadline ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date)) : null;
    return deadline ? `${ relativeRemindDays(remindDays) } (${ formatDatetime(deadline) })` : "未設定";
  }

  public static createStartDailyReportMessage() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${ dayjs().format("M月D日(ddd)") }の日報*`,
        },
      },
    ];
    return { blocks };
  }

  public static createDailyReportByUser(items: IDailyReportItems, sections: Section[], user: User, iconUrl: string) {
    const filterTodosByUser = (todos: Todo[], user: User): Todo[] => todos.filter(todo => {
      return todo.sections.some(section => sections.some(s => s.id === section.id))
        && todo.users.some(u => u.id === user.id);
    });
    const todosCompletedYesterday = filterTodosByUser(items.completedYesterday, user);
    const todosDelayed = filterTodosByUser(items.delayed, user);
    const todosOngoing = filterTodosByUser(items.ongoing, user);

    const listTodos = (todos: Todo[], warning: boolean = false): string => {
      if (todos.length) {
        const bullet = warning ? ":warning: " : "   •  ";
        return todos.map(todo => `${ bullet }<${ todo.todoapp_reg_url }|${ todo.name }>`).join("\n");
      }
    };
    const noTodoMessage = "`ありません`";
    const todoListYesterday = todosCompletedYesterday.length ? listTodos(todosCompletedYesterday) : noTodoMessage;
    const todoListToday = todosDelayed.length + todosOngoing.length === 0 ? noTodoMessage
      : todosOngoing.length === 0 ? listTodos(todosDelayed, true)
        : todosDelayed.length === 0 ? listTodos(todosOngoing)
          : listTodos(todosDelayed, true) + "\n" + listTodos(todosOngoing);
    const blocks: KnownBlock[] = [
      {
        type: "context",
        elements: [
          { type: "image", image_url: iconUrl, alt_text: user.name },
          { type: "mrkdwn", text: `*${ user.name }* さんの日報です。` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*昨日やったこと*\n${ todoListYesterday }`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*今日やること*\n${ todoListToday }`,
        },
      },
    ];

    return { blocks };
  }

  public static createSuggestNotUpdatedTodoMessage(todo: Todo, user: User) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${ NOT_UPDATED_DAYS }日以上更新されていないタスクを見つけました。\n`
            + `<@${ user.slackId }> 見直しをお願いします。`,
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `:bookmark: <${ todo.todoapp_reg_url }|${ todo.name }>` },
      },
    ];
    return { blocks };
  }

  public static createAskProspectMessage(todo: Todo) {
    const blocks: KnownBlock[] = [
      this.getAskProspectQuestion(todo),
      {
        type: "actions",
        elements: prospects.map<Button>(prospect => {
          return {
            type: "button",
            text: { type: "plain_text", emoji: true, text: prospect.text },
            value: PROSPECT_PREFIX + SEPARATOR + prospect.value,
          };
        }),
      },
    ];
    return { blocks };
  }

  public static createAskActionMessageAfterProspect(todo: Todo, prospectId: number) {
    const blocks: KnownBlock[] = this.getAnsweredProspectQuestion(todo, prospectId);
    if (prospectId <= ProspectLevel.NEUTRAL) {
      blocks.push(
        this.getAskReliefActionQuestion(),
        {
          type: "actions",
          elements: reliefActions.map<Button>(action => {
            return {
              type: "button",
              text: { type: "plain_text", emoji: true, text: action.text },
              value: RELIEF_ACTION_PREFIX + SEPARATOR + action.value,
            };
          }),
        },
      );
    }
    return { blocks };
  }

  public static createMessageAfterReliefAction(todo: Todo, prospectId: number, actionId: number) {
    const blocks: KnownBlock[] = [
      ...this.getAnsweredProspectQuestion(todo, prospectId),
      ...this.getAnsweredReliefActionQuestion(actionId),
    ];
    return { blocks };
  }

  private static getAskProspectQuestion(todo: Todo): KnownBlock {
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${ todo.todoapp_reg_url }|${ todo.name }>は期日に間に合いそうですか？\n`
          + `\`期日\` ${ this.getDeadlineText(todo.deadline) }`,
      },
    };
  }

  private static getAnsweredProspectQuestion(todo: Todo, prospectId: number): KnownBlock[] {
    const prospect = prospects.find(p => p.value === prospectId);
    return [
      this.getAskProspectQuestion(todo),
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `>*${ prospect.text }* と回答しました。` },
        ],
      },
    ];
  }

  private static getAskReliefActionQuestion(): KnownBlock {
    return {
      type: "section",
      text: { type: "mrkdwn", text: "何を見直したいですか？" },
    };
  }

  private static getAnsweredReliefActionQuestion(actionId: number): KnownBlock[] {
    const action = reliefActions.find(a => a.value === actionId);
    return [
      this.getAskReliefActionQuestion(),
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `>*${ action.text }* と回答しました。` },
        ],
      },
    ];
  }

  // TODO: SlackRepositoryへ移管する
  static getTextContentFromMessage(message: MessageAttachment) { // TODO:replyが記録できていない
    if (message.blocks && message.blocks.length) {
      const blocks = message.blocks as KnownBlock[];
      if (blocks[0].type === "section" && blocks[0].fields) {
        return blocks[0].fields.map(field => field.text)?.join("\n") ?? "";
      }
    } else if (message.actions && message.actions.length && message.actions[0].text) {
      return message.actions[0].text;
    }
    return "";
  }
}