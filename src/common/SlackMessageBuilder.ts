import dayjs from "dayjs";
import "dayjs/locale/ja";
import { Block, Button, KnownBlock } from "@slack/web-api";

import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";

import {
  AskPlanModalItems,
  prospects,
  reliefActions,
  ReliefCommentModalItems,
  SEPARATOR,
  SlackActionLabel,
} from "@/consts/slack";
import { diffDays, formatDatetime, toJapanDateTime } from "@/utils/datetime";
import { Sorter } from "@/utils/array";
import { truncate, relativeRemindDays } from "@/utils/string";
import { ProspectLevel } from "@/consts/common";

dayjs.locale("ja");

export default class SlackMessageBuilder {
  private static readonly divider: KnownBlock = { type: "divider" };
  private static getDeadlineText(deadline: Date): string {
    const remindDays = deadline ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date)) : null;
    return deadline ? `${ relativeRemindDays(remindDays) } (${ formatDatetime(deadline) })` : "未設定";
  }

  public static createAskProspectMessage(todo: Todo) {
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
        text: { type: "mrkdwn", text: `${ prospect.emoji } <${ todo.appUrl }|${ todo.name }>` },
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

  private static getAskProspectQuestion(todo: Todo): KnownBlock {
    return {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `<${ todo.appUrl }|${ todo.name }>は期日に間に合いそうですか？\n`
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

  public static createAskPlanModal(todos: Todo[], milestoneText: string): (KnownBlock | Block)[] {
    const isDelayed = (ddl: Date): boolean => dayjs(ddl).isBefore(toJapanDateTime(new Date()), "day");
    const delayedTodos = todos.filter(todo => isDelayed(todo.deadline)).sort(Sorter.byDate<Todo>("deadline"));
    const ongoingTodos = todos.filter(todo => !isDelayed(todo.deadline)).sort(Sorter.byDate<Todo>("deadline"));
    const getOption = (todo: Todo, prepend: string = "") => {
      return {
        text: {
          type: "plain_text" as const,
          emoji: true,
          text: prepend + truncate(todo.name, 48, 1, 2),
        },
        value: todo.id.toString(),
      };
    };
    return [
      {
        type: "section",
        text: { type: "plain_text", emoji: true, text: `${ milestoneText }着手するタスクを教えてください。` },
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
    const milestoneText = milestone ? `${ h }:${ m }までに` : "今日";
    const blocks: KnownBlock[] = [
      this.getAskOpenModalBlock(
        `お疲れ様です:raised_hands:\n${ milestoneText }着手するタスクを教えてください。`,
        "選択する",
        SlackActionLabel.OPEN_PLAN_MODAL + SEPARATOR + milestoneText,
      ),
    ];
    return { blocks };
  }
}
