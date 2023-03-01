import dayjs from "dayjs";
import "dayjs/locale/ja";
import { Button, KnownBlock, MessageAttachment } from "@slack/web-api";

import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";
import Section from "@/entities/settings/Section";
import DailyReport from "@/entities/transactions/DailyReport";

import {
  AskPlanModalItems, DEFAULT_BULLET,
  Icons,
  prospects,
  reliefActions, ReliefCommentModalItems,
  replyActionsAfter,
  replyActionsBefore, SEPARATOR,
  SlackActionLabel,
} from "@/consts/slack";
import { diffDays, formatDatetime, relativeRemindDays, Sorter, toJapanDateTime, truncate } from "@/utils/common";
import { ITodoSlack } from "@/types/slack";
import { IDailyReportItems, valueOf } from "@/types";
import { NOT_UPDATED_DAYS, ProspectLevel, TodoHistoryAction } from "@/consts/common";
import { PlainTextOption } from "@slack/types";
import TodoAppUser from "@/entities/settings/TodoAppUser";

dayjs.locale("ja");

export default class SlackMessageBuilder {
  private static readonly divider: KnownBlock = { type: "divider" };

  public static createRemindMessage(user: User, todo: Todo, remindDays: number) {
    const relativeDays = relativeRemindDays(remindDays);
    const actions = remindDays > 0 ? replyActionsAfter : replyActionsBefore;
    const blocks: KnownBlock[] = [
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*タスク:*\n<${todo.todoapp_reg_url}|${todo.name}>`,
          },
          {
            type: "mrkdwn",
            text: `*期日:*\n${relativeDays}`,
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

  public static createReplaceMessageAfterReply(userId: string, todo: Todo, message: string) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<${todo.todoapp_reg_url}|${todo.name}>は *${message}* で伝えました`,
        },
      },
    ];
    return { blocks };
  }

  public static createShareMessage(userId: string, todo: Todo, message: string) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        fields: [
          {
            type: "mrkdwn",
            text: `*タスク:*\n<${todo.todoapp_reg_url}|${todo.name}>`,
          },
          {
            type: "mrkdwn",
            text: `*期日:*\n${dayjs(todo.deadline).format("M月D日(ddd)")}`,
          },
          {
            type: "mrkdwn",
            text: `*進捗:*\n${message}`,
          },
          {
            type: "mrkdwn",
            text: `*回答者:*\n<@${userId}>`,
          },
        ],
      },
    ];
    return { blocks };
  }

  public static createBeforeRemindMessage(user: User, todoSlacks: ITodoSlack[]) {
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

  public static createNotifyUnsetMessage(adminUser: User, todos: Todo[]) {
    const todoList = todos.map(todo => `:bookmark: <${todo.todoapp_reg_url}|${todo.name}>`);
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

  public static createNotifyUnassignedMessage(adminUser: User, todos: Todo[]) {
    const todoList = todos.map(todo => `:bookmark: <${todo.todoapp_reg_url}|${todo.name}>`);
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

  public static createNotifyNoDeadlineMessage(user: User, todos: Todo[]) {
    const todoList = todos.map(todo => `:bookmark: <${todo.todoapp_reg_url}|${todo.name}>`);
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `<@${user.slackId}> お疲れさまです:raised_hands:\n`
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

  public static createNotifyNothingMessage() {
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

  public static createNotifyOnCreatedMessage(todo: Todo, assignees: User[], editUser: TodoAppUser) {
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: `${Icons.CREATED} タスクが追加されました。` },
    }];
    const attachments: MessageAttachment[] = [this.createTodoAttachment(todo, assignees, editUser)];
    return { blocks, attachments };
  }

  public static createNotifyOnCompletedMessage(todo: Todo, editUser: TodoAppUser) {
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: `${Icons.DONE} タスクを完了しました。` },
    }];
    const attachments: MessageAttachment[] = [this.createTodoAttachment(todo, null, editUser)];
    return { blocks, attachments };
  }

  private static createTodoAttachment(
    todo: Todo,
    assignees: User[] = todo.users,
    editUser: TodoAppUser,
    color: string = "good",
  ): MessageAttachment {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*<${todo.todoapp_reg_url}|${todo.name}>*` },
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `${Icons.ASSIGNEE} ${this.getAssigneesText(assignees)}` },
          { type: "mrkdwn", text: `${Icons.DEADLINE} ${this.getDeadlineText(todo.deadline)}` },
        ],
      },
      {
        type: "context",
        elements: [
          { type: "image", image_url: editUser.avatar, alt_text: editUser.user_app_name },
          { type: "mrkdwn", text: editUser.user_app_name },
        ],
      },
    ];
    return { blocks, color };
  }

  public static createNotifyOnAssigneeUpdatedMessage(
    todo: Todo,
    action: valueOf<typeof TodoHistoryAction>,
    assignees: User[],
    editUser: TodoAppUser,
  ) {
    const message = action === TodoHistoryAction.CREATE ? `${Icons.ASSIGNEE} 担当者が設定されました。`
      : action === TodoHistoryAction.DELETE ? `${Icons.ASSIGNEE} 担当者が削除されました。`
        : `${Icons.ASSIGNEE} 担当者が変更されました。`;
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: message },
    }];
    const attachmentBlocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*<${todo.todoapp_reg_url}|${todo.name}>*` },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `~${this.getAssigneesText(todo.users)}~ → *${this.getAssigneesText(assignees)}*`,
        },
      },
      {
        type: "context",
        elements: [
          { type: "image", image_url: editUser.avatar, alt_text: editUser.user_app_name },
          { type: "mrkdwn", text: editUser.user_app_name },
        ],
      },
    ];
    const attachments: MessageAttachment[] = [{ color: "good", blocks: attachmentBlocks }];
    return { blocks, attachments };
  }

  public static createNotifyOnDeadlineUpdatedMessage(
    todo: Todo,
    action: valueOf<typeof TodoHistoryAction>,
    deadline: Date,
    editUser: TodoAppUser) {
    const message = action === TodoHistoryAction.CREATE ? `${Icons.DEADLINE} 期日が設定されました。`
      : action === TodoHistoryAction.DELETE ? `${Icons.DEADLINE} 期日が削除されました。`
        : `${Icons.DEADLINE} 期日が変更されました。`;
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: message },
    }];
    const attachmentBlocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*<${todo.todoapp_reg_url}|${todo.name}>*` },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `~${this.getDeadlineText(todo.deadline)}~ → *${this.getDeadlineText(deadline)}*`,
        },
      },
      {
        type: "context",
        elements: [
          { type: "image", image_url: editUser.avatar, alt_text: editUser.user_app_name },
          { type: "mrkdwn", text: editUser.user_app_name },
        ],
      },
    ];
    const attachments: MessageAttachment[] = [{ color: "good", blocks: attachmentBlocks }];
    return { blocks, attachments };
  }

  public static createNotifyOnClosedUpdatedMessage(
    todo: Todo,
    action: valueOf<typeof TodoHistoryAction>,
    editUser: TodoAppUser) {
    const message = action === TodoHistoryAction.CREATE
      ? `${Icons.CLOSED} 保留されました。`
      : `${Icons.CLOSED} 対応予定に戻されました。`;
    const blocks: KnownBlock[] = [{
      type: "section",
      text: { type: "mrkdwn", text: message },
    }];
    const attachmentBlocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `*<${todo.todoapp_reg_url}|${todo.name}>*` },
      },
      {
        type: "context",
        elements: [
          { type: "image", image_url: editUser.avatar, alt_text: editUser.user_app_name },
          { type: "mrkdwn", text: editUser.user_app_name },
        ],
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
    return deadline ? `${relativeRemindDays(remindDays)} (${formatDatetime(deadline)})` : "未設定";
  }

  public static createStartDailyReportMessage() {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${dayjs().format("M月D日(ddd)")}の日報*`,
        },
      },
    ];
    return { blocks };
  }

  public static createDailyReportByUser(items: IDailyReportItems, sections: Section[], user: User, iconUrl: string) {
    const filteredItems = this.filterTodosByUser(items, sections, user);
    const blocks = this.getDailyReportBlocks(
      user,
      iconUrl,
      filteredItems.completedYesterday,
      filteredItems.delayed,
      filteredItems.ongoing
    );
    return { blocks };
  }

  public static createDailyReportWithProspect(dailyReport: DailyReport, items: IDailyReportItems, iconUrl: string) {
    const filteredItems = this.filterTodosByUser(items, dailyReport.section_ids, dailyReport.user);
    const blocks = this.getDailyReportBlocks(
      dailyReport.user,
      iconUrl,
      filteredItems.completedYesterday,
      filteredItems.delayed,
      filteredItems.ongoing,
      true
    );
    return { blocks };
  }

  private static filterTodosByUser(
    items: IDailyReportItems,
    sections: (Section | number)[],
    user: User
  ): IDailyReportItems {
    const sectionIds = sections?.length && typeof sections[0] === "number"
      ? sections
      : sections.map((s: Section) => s.id);
    const filteredItems: IDailyReportItems = { completedYesterday: [], delayed: [], ongoing: [] };
    Object.keys(items).forEach((key: keyof typeof items) => {
      filteredItems[key] = items[key].filter(todo => {
        return todo.sections.some(section => sectionIds.includes(section.id))
          && todo.users.some(u => u.id === user.id);
      });
    });
    return filteredItems;
  }

  private static getDailyReportBlocks(
    user: User,
    iconUrl: string,
    todosCompletedYesterday: Todo[],
    todosDelayed: Todo[],
    todosOngoing: Todo[],
    displayProspects: boolean = false,
  ): KnownBlock[] {
    const listTodos = (todos: Todo[], showProspects: boolean = false, warning: boolean = false): string => {
      if (todos.length) {
        return todos.map(todo => {
          let bullet = DEFAULT_BULLET;
          if (todo.latestProspect && todo.latestProspect?.prospect) {
            const prospect = todo.latestProspect?.prospect;
            bullet = showProspects && prospect
              ? prospects.find(p => p.value === prospect)?.emoji ?? DEFAULT_BULLET
              : DEFAULT_BULLET;
          }
          const warningEmoji = warning ? ":warning:" : "";
          const truncatedTodoName = truncate(todo.name, 48, 1, 2);
          return `${bullet} <${todo.todoapp_reg_url}|${truncatedTodoName}> ${warningEmoji}`;
        }).join("\n");
      }
    };
    const noTodoMessage = "`ありません`";
    const todoListYesterday = todosCompletedYesterday.length ? listTodos(todosCompletedYesterday) : noTodoMessage;
    const todoListToday = todosDelayed.length + todosOngoing.length === 0 ? noTodoMessage
      : todosOngoing.length === 0 ? listTodos(todosDelayed, displayProspects, true)
        : todosDelayed.length === 0 ? listTodos(todosOngoing, displayProspects)
          : listTodos(todosDelayed, displayProspects, true) + "\n" + listTodos(todosOngoing, displayProspects);
    return [
      {
        type: "context",
        elements: [
          { type: "image", image_url: iconUrl, alt_text: user.name },
          { type: "mrkdwn", text: `*${user.name}* さんの日報です。` },
        ],
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*昨日やったこと*\n${todoListYesterday}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*今日やること*\n${todoListToday}`,
        },
      },
      this.divider,
    ];
  }

  public static createSuggestNotUpdatedTodoMessage(todo: Todo, user: User) {
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${NOT_UPDATED_DAYS}日以上更新されていないタスクを見つけました。\n`
            + `<@${user.slackId}> 見直しをお願いします。`,
        },
      },
      {
        type: "section",
        text: { type: "mrkdwn", text: `:bookmark: <${todo.todoapp_reg_url}|${todo.name}>` },
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
            text: { type: "plain_text", emoji: true, text: `${prospect.emoji} ${prospect.text}` },
            action_id: SlackActionLabel.PROSPECT + SEPARATOR + prospect.value.toString(),
          };
        }),
      },
      this.divider,
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
              action_id: SlackActionLabel.RELIEF_ACTION + SEPARATOR + action.value.toString(),
            };
          }),
        },
      );
    }
    blocks.push(this.divider);
    return { blocks };
  }

  public static createAskCommentMessageAfterReliefAction(todo: Todo, prospectId: number, actionId: number) {
    const blocks: KnownBlock[] = [
      ...this.getAnsweredProspectQuestion(todo, prospectId),
      ...this.getAnsweredReliefActionQuestion(actionId),
      this.getAskOpenModalBlock(
        "ひと言コメントをお願いします。",
        "入力する",
        SlackActionLabel.OPEN_RELIEF_COMMENT_MODAL,
      ),
      this.divider,
    ];
    return { blocks };
  }

  public static createThanksForCommentMessage(todo: Todo, prospectId: number, actionId: number, comment: string) {
    const blocks: KnownBlock[] = [
      ...this.getAnsweredProspectQuestion(todo, prospectId),
      ...this.getAnsweredReliefActionQuestion(actionId),
      {
        type: "section",
        text: { type: "mrkdwn", text: "コメントを共有しました。\n```" + comment + "```" },
      },
      this.divider,
    ];
    return { blocks };
  }

  public static createShareReliefMessage(
    todo: Todo,
    user: User,
    prospectId: number,
    actionId: number,
    comment: string,
    iconUrl: string,
  ) {
    const prospect = prospects.find(p => p.value === prospectId);
    const action = reliefActions.find(a => a.value === actionId);
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `${prospect.emoji} <${todo.todoapp_reg_url}|${todo.name}>` },
      },
      {
        type: "context",
        elements: [
          { type: "image", image_url: iconUrl, alt_text: user.name },
          { type: "mrkdwn", text: `<@${user.slackId}> *${action.text}* を見直したい。` },
        ],
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: comment },
        ],
      },
    ];
    return { blocks };
  }

  public static createPromptDiscussionMessage(users: User[]) {
    const mentions = users.map(u => `<@${u.slackId}>`).join(" ");
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `${mentions}\nひとことコメントをお願いします :pleading_face:` },
      },
    ];
    return { blocks };
  }

  private static getAskProspectQuestion(todo: Todo): KnownBlock {
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${todo.todoapp_reg_url}|${todo.name}>は期日に間に合いそうですか？\n`
          + `\`期日\` ${this.getDeadlineText(todo.deadline)}`,
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
          { type: "mrkdwn", text: `>*${prospect.emoji} ${prospect.text}* と回答しました。` },
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
          { type: "mrkdwn", text: `>*${action.text}* と回答しました。` },
        ],
      },
    ];
  }

  private static getAskOpenModalBlock(
    questionText: string,
    buttonText: string,
    actionId: string,
  ): KnownBlock {
    return {
      type: "section",
      text: { type: "mrkdwn", text: questionText },
      accessory: {
        type: "button",
        text: { type: "plain_text", emoji: true, text: buttonText },
        action_id: actionId,
      },
    };
  }

  public static createReliefCommentModal(): KnownBlock[] {
    return [
      {
        type: "section",
        text: { type: "plain_text", emoji: true, text: "ひとことコメントをお願いします。" },
      },
      {
        type: "input",
        element: {
          type: "plain_text_input",
          action_id: ReliefCommentModalItems.COMMENT,
          multiline: true,
          focus_on_load: true,
        },
        label: { type: "plain_text", emoji: true, text: "コメント" },
        block_id: ReliefCommentModalItems.COMMENT,
      },
    ];
  }

  public static createAskPlanModal(todos: Todo[], milestoneText: string): KnownBlock[] {
    const isDelayed = (ddl: Date): boolean => dayjs(ddl).isBefore(dayjs(), "day");
    const delayedTodos = todos.filter(todo => isDelayed(todo.deadline)).sort(Sorter.byDate("deadline"));
    const ongoingTodos = todos.filter(todo => !isDelayed(todo.deadline)).sort(Sorter.byDate("deadline"));
    const getOption = (todo: Todo, prepend: string = ""): PlainTextOption => {
      return {
        text: { type: "plain_text", emoji: true, text: prepend + truncate(todo.name, 48, 1, 2) },
        value: todo.id.toString(),
      };
    };
    return [
      {
        type: "section",
        text: { type: "plain_text", emoji: true, text: `${milestoneText}着手するタスクを教えてください。` },
      },
      {
        type: "input",
        element: {
          type: "multi_static_select",
          action_id: AskPlanModalItems.TODOS,
          focus_on_load: true,
          options: [
            ...delayedTodos.map(todo => getOption(todo, ":warning: ")),
            ...ongoingTodos.map(todo => getOption(todo)),
          ],
        },
        label: { type: "plain_text", emoji: true, text: "タスク" },
        block_id: AskPlanModalItems.TODOS,
      },
    ];
  }

  public static createAskPlansMessage(milestone?: string) {
    const [h, m] = milestone ? milestone.split(":") : [];
    const milestoneText = milestone ? `${h}:${m}までに` : "今日";
    const blocks: KnownBlock[] = [
      this.getAskOpenModalBlock(
        `お疲れ様です:raised_hands:\n${milestoneText}着手するタスクを教えてください。`,
        "選択する",
        SlackActionLabel.OPEN_PLAN_MODAL + SEPARATOR + milestoneText,
      ),
    ];
    return { blocks };
  }

  // TODO: SlackRepositoryへ移管する
  public static getTextContentFromMessage(message: MessageAttachment) { // TODO:replyが記録できていない
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