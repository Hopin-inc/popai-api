import dayjs from "dayjs";
import "dayjs/locale/ja";
import { Block, Button, ContextBlock, HeaderBlock, HomeView, KnownBlock, KnownBlockExtended, SectionBlock } from "@slack/web-api";

import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";

import {
  ActionItemWithEmoji,
  AskPlanModalItems,
  prospects,
  reliefActions,
  ReliefCommentModalItems,
  REMIND_MAX_ITEMS,
  REMIND_MAX_ALERT_ITEMS,
  SEPARATOR,
  SlackActionLabel,
} from "@/consts/slack";
import { diffDays, formatDatetime, toJapanDateTime } from "@/utils/datetime";
import { Sorter } from "@/utils/array";
import { truncate, relativeRemindDays } from "@/utils/string";
import { AskMode, ProspectLevel } from "@/consts/common";
import Project from "@/entities/transactions/Project";
import { getProspects } from "@/utils/slack";
import StatusConfig from "@/entities/settings/StatusConfig";
import { UserTodosReport } from "@/types/slack";

dayjs.locale("ja");

export default class SlackMessageBuilder {
  private static readonly divider: KnownBlock = { type: "divider" };
  private static getDeadlineText(deadline: Date): string {
    const remindDays = deadline ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date)) : null;
    return deadline ? `${ relativeRemindDays(remindDays) } (${ formatDatetime(deadline) })` : "未設定";
  }

  public static createAskProspectMessageOnProjects(project: Project, statusConfig: StatusConfig) {
    const prospects = getProspects(statusConfig);
    const blocks: KnownBlock[] = [
      this.getAskProspectQuestion(project),
      {
        type: "actions",
        elements: prospects.map<Button>(prospect => {
          return {
            type: "button",
            text: { type: "plain_text", emoji: true, text: `${ prospect.emoji } ${ prospect.text }` },
            action_id: SlackActionLabel.PROSPECT + SEPARATOR + prospect.value.toString(),
          };
        }),
      },
      this.divider,
    ];
    return { blocks };
  }

  public static createAskProspectMessageOnTodos(todo: Todo, statusConfig: StatusConfig) {
    const prospects = getProspects(statusConfig);
    const blocks: KnownBlock[] = [
      this.getAskProspectQuestion(todo),
      {
        type: "actions",
        elements: prospects.map<Button>(prospect => {
          return {
            type: "button",
            text: { type: "plain_text", emoji: true, text: `${ prospect.emoji } ${ prospect.text }` },
            action_id: SlackActionLabel.PROSPECT + SEPARATOR + prospect.value.toString(),
          };
        }),
      },
      this.divider,
    ];
    return { blocks };
  }

  public static createPublicRemind<T extends Project | Todo>(items: T[]) {
    const blocks: KnownBlock[] = [
      this.sectionMessage("遅延しているタスクの期日を再設定しましょう😖"),
      this.remindContext,
      ...items.slice(0, REMIND_MAX_ITEMS).map(item => this.getPublicRemind(item)),
    ];
    if (items.length > REMIND_MAX_ITEMS) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `他${ items.length - REMIND_MAX_ITEMS }件を見る`,
        },
      });
    }
    return { blocks };
  }

  public static createPersonalRemind<T extends Project | Todo>(items: T[]) {
    const blocks: KnownBlock[] = [
      this.sectionMessage("遅延しているタスクの期日を再設定しましょう😖"),
      this.remindContext,
      ...items.slice(0, REMIND_MAX_ITEMS).map(item => this.getPersonalRemind(item)),
    ];
    if (items.length > REMIND_MAX_ITEMS) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `他${ items.length - REMIND_MAX_ITEMS }件を見る`,
        },
      });
    }
    return { blocks };
  }

  private static readonly headerMessage = (message: string): HeaderBlock => {
    return {
      type: "header",
      text: {
        type: "plain_text",
        text: message,
      },
    };
  };
  private static readonly sectionMessage = (message: string): SectionBlock => {
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: message,
      },
    };
  };

  private static readonly remindContext: ContextBlock = {
    type: "context",
    elements: [
      {
        type: "image",
        image_url: "https://cdn-icons-png.flaticon.com/512/2556/2556974.png", // TODO: Avoid hard coding.
        alt_text: "alert",
      },
      { type: "mrkdwn", text: "疑問や不安があれば、関係者に聞きましょう。" },
    ],
  };

    public static createAskActionMessageAfterProspect<T extends Project | Todo>(
    item: T,
    prospectId: number,
  ) {
    const blocks: KnownBlock[] = this.getAnsweredProspectQuestion(item, prospectId);
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

  public static createAskCommentMessageAfterReliefAction<T extends Project | Todo>(
    item: T,
    prospectId: number,
    actionId: number,
  ) {
    const blocks: KnownBlock[] = [
      ...this.getAnsweredProspectQuestion(item, prospectId),
      ...this.getAnsweredReliefActionQuestion(actionId),
      this.getAskOpenModalBlock(
        "ひと言コメントをお願いします。",
        "入力する",
        SlackActionLabel.OPEN_RELIEF_COMMENT_MODAL,
        SlackActionLabel.OPEN_RELIEF_COMMENT_MODAL,
        item.companyId,
      ),
      this.divider,
    ];
    return { blocks };
  }

  public static createThanksForCommentMessage<T extends Project | Todo>(
    item: T,
    prospectId: number,
    actionId: number,
    comment: string,
  ) {
    const blocks: KnownBlock[] = [
      ...this.getAnsweredProspectQuestion(item, prospectId),
      ...this.getAnsweredReliefActionQuestion(actionId),
      {
        type: "section",
        text: { type: "mrkdwn", text: "コメントを共有しました。\n```" + comment + "```" },
      },
      this.divider,
    ];
    return { blocks };
  }

  public static createShareReliefMessage<T extends Project | Todo>(
    item: T,
    user: User,
    prospectId: number,
    actionId: number,
    comment: string,
    iconUrl: string,
  ) {
    const prospect = prospects.find(p => p.value === prospectId);
    const action = reliefActions.find(a => a.value === actionId);
    const itemTitle = item.appUrl ? `<${ item.appUrl }|${ item.name }>` : item.name;
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `${ prospect.emoji } ${ itemTitle }` },
      },
      {
        type: "context",
        elements: [
          { type: "image", image_url: iconUrl, alt_text: user.name },
          { type: "mrkdwn", text: `<@${ user.chatToolUser.appUserId }> *${ action.text }* を見直したい。` },
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
    const mentions = users.map(u => `<@${ u.chatToolUser.appUserId }>`).join(" ");
    const blocks: KnownBlock[] = [
      {
        type: "section",
        text: { type: "mrkdwn", text: `${ mentions }\nひとことコメントをお願いします :pleading_face:` },
      },
    ];
    return { blocks };
  }

  private static getAskProspectQuestion<T extends Todo | Project>(item: T): KnownBlock {
    const itemTitle = item.appUrl ? `<${ item.appUrl }|${ item.name }>` : item.name;
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${ itemTitle }は期日に間に合いそうですか？\n`
          + `\`期日\` ${ this.getDeadlineText(item.deadline) }`,
      },
    };
  }

  private static getPublicRemind<T extends Todo | Project>(item: T): SectionBlock {
    const itemTitle = item.appUrl ? `<${ item.appUrl }|${ item.name }>` : item.name;
    const users = item.users?.length
      ? item.users
        .map(user => user?.chatToolUser?.appUserId ? `<@${ user?.chatToolUser?.appUserId }>` : user?.name)
        .join(", ")
      : "不在";
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${ itemTitle }\n期日: *${ this.getDeadlineText(item.deadline) }*\n`
          + `担当者: ${ users }`,
      },
    };
  }

  private static getPersonalRemind<T extends Todo | Project>(item: T): SectionBlock {
    const itemTitle = item.appUrl ? `<${ item.appUrl }|${ item.name }>` : item.name;
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${ itemTitle }\n期日: *${ this.getDeadlineText(item.deadline) }*`,
      },
      accessory: item.appUrl ? {
        type: "button",
        text: {
          type: "plain_text",
          emoji: true,
          text: "再設定する",
        },
        url: item.appUrl,
      } : undefined,
    };
  }

  private static getAnsweredProspectQuestion<T extends Project | Todo>(
    item: T,
    prospectId: number,
  ): KnownBlock[] {
    const prospect = prospects.find(p => p.value === prospectId);
    return [
      this.getAskProspectQuestion(item),
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `>*${ prospect.emoji } ${ prospect.text }* と回答しました。` },
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

  private static getAskOpenModalBlock(
    questionText: string,
    buttonText: string,
    identifier: string,
    value: string,
    companyId: string,
  ): KnownBlock {
    return {
      type: "section",
      text: { type: "mrkdwn", text: questionText },
      accessory: {
        type: "button",
        text: { type: "plain_text", emoji: true, text: buttonText },
        action_id: identifier + SEPARATOR + value + SEPARATOR + companyId,
      },
    };
  }

  public static createReliefCommentModal(): (KnownBlock | Block)[] {
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

  public static createAskPlanModal<T extends Todo | Project>(
    items: T[],
    mode: number,
  ): (KnownBlock | Block)[] {
    const isDelayed = (ddl: Date): boolean => dayjs(ddl).isBefore(toJapanDateTime(new Date()), "day");
    const delayedItems = items
      .filter(item => isDelayed(item.deadline))
      .sort(Sorter.byDate<T>("deadline"));
    const ongoingItems = items
      .filter(item => !isDelayed(item.deadline))
      .sort(Sorter.byDate<T>("deadline"));
    const getOption = (item: T, prepend: string = "") => {
      return {
        text: {
          type: "plain_text" as const,
          emoji: true,
          text: prepend + truncate(item.name, 48, 1, 2),
        },
        value: item.id.toString(),
      };
    };
    return [
      {
        type: "section",
        text: {
          type: "plain_text",
          emoji: true,
          text: mode === AskMode.FORWARD ? "今日やる予定のタスクを選んでください。"
            : mode === AskMode.BACKWARD ? "今日取り組んだタスクを選んでください。"
              : "タスクを選んでください。",
        },
      },
      {
        type: "input",
        element: {
          type: "multi_static_select",
          action_id: AskPlanModalItems.TODOS,
          focus_on_load: true,
          options: [
            ...delayedItems.map(item => getOption(item, ":warning: ")),
            ...ongoingItems.map(item => getOption(item)),
          ],
        },
        label: { type: "plain_text", emoji: true, text: "タスク" },
        block_id: AskPlanModalItems.TODOS,
      },
    ];
  }

  public static createAskPlansMessageOnTodos(mode: number, companyId: string) {
    const questionText: string | null = mode === AskMode.FORWARD
      ? "お疲れ様です:raised_hands:\n今日やる予定のタスクについて教えてください。"
      : mode === AskMode.BACKWARD
        ? "お疲れ様です:raised_hands:\n今日取り組んだタスクについて教えてください。"
        : null;
    const blocks: KnownBlock[] = questionText ? [
      this.getAskOpenModalBlock(
        questionText,
        "選択する",
        SlackActionLabel.OPEN_ASK_MODAL,
        mode.toString(),
        companyId,
      ),
    ] : [];
    return { blocks };
  }

  public static createPublicReportTodos<T extends UserTodosReport>(
    items: T[],
    statusConfig: StatusConfig,
  ): HomeView {
    const prospects = getProspects(statusConfig);
    const blocks: KnownBlockExtended[] = [
      this.headerMessage("従業員の状況"),
      this.sectionMessage("直近2週間の従業員の皆さんの状況をお知らせします。"),
    ];

    if (items.length) {
      items.forEach((item, index) => {
        const reportMessageBlocks = this.generateReportMessageBlock(item, prospects);
        blocks.push(...reportMessageBlocks);

        if (index < items.length - 1) blocks.push({ type: "divider" });
      },
      );
    }

    return {
      type: "home",
      blocks: blocks,
    };
  }

  public static createPersonalReportTodos<T extends UserTodosReport>(
    item: T,
    statusConfig: StatusConfig,
  ): HomeView {
    const prospects = getProspects(statusConfig);
    const blocks: KnownBlockExtended[] = [
      this.headerMessage("あなたの状況"),
      this.sectionMessage("直近2週間のあなたの状況をお知らせします。"),
    ];

    const reportMessageBlocks = this.generateReportMessageBlock(item, prospects);
    blocks.push(...reportMessageBlocks);

    return {
      type: "home",
      blocks: blocks,
    };
  }

  private static generateReportMessageBlock<T extends UserTodosReport>(
    item: T,
    prospects: ActionItemWithEmoji[],
  ): KnownBlockExtended[] {

    const generateTodoBlock = (
      item: T,
      emojiName: string,
      labelText: string,
      value: string,
    ) => {
      return {
        type: "rich_text_section",
        elements: [
          {
            type: "emoji",
            name: emojiName,
          },
          {
            type: "text",
            text: labelText,
          },
          {
            type: "text",
            text: value,
            ...(item.num_alert_tasks && {
              style: { bold: true, code: true },
            }),
          },
        ],
      };
    };

    const taskAlertListBlock = (todos: Todo[]) => {
      return todos.slice(0, REMIND_MAX_ALERT_ITEMS).map(todo => {
        const prospect = prospects.find(p => p.value === todo.latestProspect?.prospectValue);

        return {
          type: "rich_text_section",
          elements: [
            {
              type: "emoji",
              name: `${ prospect.emoji.replace(/:/g, "") }`,
            },
            {
              type: "link",
              url: `${ todo.appUrl }`,
              text: `${ todo.name }`,
            },
          ],
        };
      });
    };

    return [
      this.sectionMessage(`*${ item.user.name }*`),
      {
        type: "rich_text",
        elements: [
          { ...generateTodoBlock(item, "clock3", "リマインドへの返信時間: ", `${ item.response_time }時間`) },
          { ...generateTodoBlock(item, "pushpin", "進行中のタスク: ", `${ item.num_tasks_doing }件`) },
          { ...generateTodoBlock(item, "warning", "アラートをあげたタスク: ", `${ item.num_alert_tasks }件`) },
          {
            type: "rich_text_list",
            style: "bullet",
            elements: [...taskAlertListBlock(item.alert_todos)],
          },
        ],
      },
    ];
  }
}
