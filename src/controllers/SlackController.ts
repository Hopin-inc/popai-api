import { Controller } from "tsoa";
import Container from "typedi";
import { Repository } from "typeorm";

import ChatTool from "@/entities/masters/ChatTool";
import User from "@/entities/settings/User";
import Todo from "@/entities/transactions/Todo";
import Section from "@/entities/settings/Section";

import CommonRepository from "@/repositories/modules/CommonRepository";
import SlackRepository from "@/repositories/SlackRepository";

import { ChatToolCode, MessageTriggerType, TodoStatus } from "@/consts/common";
import logger from "@/logger/winston";
import { LoggerError } from "@/exceptions";
import { toJapanDateTime } from "@/utils/common";
import AppDataSource from "@/config/data-source";
import TaskService from "@/services/TaskService";
import SlackMessageBuilder from "@/common/SlackMessageBuilder";
import SlackBot from "@/config/slack-bot";
import {
  AskPlanModalItems,
  ReliefCommentModalItems,
  replyActions,
  SEPARATOR,
  SlackActionLabel,
  SlackModalLabel,
} from "@/consts/slack";
import { Block, KnownBlock } from "@slack/web-api";
import { SlackInteractionPayload, SlackView } from "@/types/slack";
import { PlainTextOption } from "@slack/types";

import { SectionRepository } from "@/repositories/SectionRepository";

export default class SlackController extends Controller {
  private slackRepository: SlackRepository;
  private chatToolRepository: Repository<ChatTool>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;
  private taskService: TaskService;

  constructor() {
    super();
    this.slackRepository = Container.get(SlackRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.chatToolRepository = AppDataSource.getRepository(ChatTool);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.taskService = Container.get(TaskService);
  }

  async handleEvent(payload: SlackInteractionPayload): Promise<[any, (...args) => unknown | undefined]> {
    try {
      const chatTool = await this.chatToolRepository.findOneBy({
        tool_code: ChatToolCode.SLACK,
      });

      if (!chatTool) {
        logger.error(new LoggerError("SLACK is not implemented yet!"));
        return;
      }

      if (payload.type === "block_actions") {
        const { user, container, actions, trigger_id: triggerId } = payload;
        if (!actions.length) {
          return;
        }

        const slackId = user.id;
        const repliedMessage = actions[0].text.text.toLowerCase();
        const { action_id: actionId } = actions[0];
        const slackUser = await this.slackRepository.getUserFromSlackId(slackId);

        const channelId = container.channel_id;
        const threadId = container.message_ts;

        return [
          await this.handleBlockActions(chatTool, slackUser, slackId, repliedMessage, channelId, threadId, triggerId, actionId),
          undefined,
        ];
      } else if (payload.type === "view_submission") {
        const { user, view } = payload;
        const slackUser = await this.slackRepository.getUserFromSlackId(user.id);
        return await this.handleViewSubmissions(slackUser, view);
      } else {
        logger.error(new LoggerError("Unknown Response"));
      }
    } catch (error) {
      console.error(error);
    }
  }

  private async handleBlockActions(
    chatTool: ChatTool,
    user: User,
    slackId: string,
    repliedMessage: string,
    channelId: string,
    threadId: string,
    triggerId: string,
    actionId: string,
  ) {
    if (!user) {
      return;
    }
    const [identifier, value] = actionId.split(SEPARATOR);
    switch (identifier) {
      case SlackActionLabel.PROSPECT:
        await this.slackRepository.respondToProspect(chatTool, user, slackId, parseInt(value), channelId, threadId);
        break;
      case SlackActionLabel.RELIEF_ACTION:
        await this.slackRepository.respondToReliefAction(chatTool, user, slackId, parseInt(value), channelId, threadId);
        break;
      case SlackActionLabel.OPEN_RELIEF_COMMENT_MODAL:
        await this.slackRepository.openReliefCommentModal(channelId, threadId, triggerId);
        break;
      case SlackActionLabel.OPEN_PLAN_MODAL:
        await this.slackRepository.openPlanModal(user, channelId, triggerId, value);
        break;
      default:
        await this.respondToRemindReply(chatTool, slackId, repliedMessage, channelId, threadId);
        break;
    }
  }

  private async handleViewSubmissions(user: User, view: SlackView): Promise<[any, (...args) => unknown | undefined]> {
    if (view.type === "modal") {
      switch (view.callback_id) {
        case SlackModalLabel.RELIEF_COMMENT:
          const comment = this.getInputValue<string>(
            view,
            ReliefCommentModalItems.COMMENT,
            ReliefCommentModalItems.COMMENT,
          );
          const prospect = await this.slackRepository.receiveReliefComment(view.id, comment);
          return [
            undefined,
            async () => await this.slackRepository.shareReliefCommentAndUpdateDailyReport(view.id, comment, prospect),
          ];
        case SlackModalLabel.PLAN:
          const selectedOptions = this.getInputValue<PlainTextOption[]>(
            view,
            AskPlanModalItems.TODOS,
            AskPlanModalItems.TODOS,
            "selected_options",
          );
          const todoIds = selectedOptions.map(option => parseInt(option.value));
          return [
            undefined,
            async () => {
              const todos = await this.commonRepository.getTodosByIds(todoIds);
              await this.slackRepository.askProspects(user.company, { user, todos });
            },
          ];
        default:
          break;
      }
    }
  }

  private getInputValue<T>(view: SlackView, blockId: string, actionId: string, key: string = "value"): T {
    const values = view?.state?.values;
    if (!values) {
      return null;
    }
    const targetBlocks = values[blockId];
    if (!targetBlocks) {
      return null;
    }
    const targetInput = targetBlocks[actionId];
    if (!targetInput) {
      return null;
    } else {
      return targetInput[key] as T;
    }
  }

  private async respondToRemindReply(
    chatTool: ChatTool,
    slackId: string,
    repliedMessage: string,
    channelId: string,
    threadId: string,
  ) {
    const slackTodo = await this.slackRepository.getSlackTodo(channelId, threadId);

    await SlackBot.chat.update({
      channel: channelId,
      ts: threadId,
      text: repliedMessage,
      blocks: SlackMessageBuilder.createReplaceMessageAfterReply(slackId, slackTodo, repliedMessage).blocks,
    });

    const sections = slackTodo.sections;
    const sectionId = sections.length ? sections[0].id : null;
    const todoAppId = slackTodo.todoapp_id;
    const boardAdminUser = await SectionRepository.getBoardAdminUser(sectionId);
    const todoAppAdminUser = boardAdminUser.todoAppUsers.find(tau => tau.todoapp_id === todoAppId);
    const doneActions = replyActions.filter(m => m.status === TodoStatus.DONE).map(m => m.text);
    if (doneActions.includes(repliedMessage)) {
      slackTodo.is_done = true;
      const correctDelayedCount = slackTodo.deadline < toJapanDateTime(new Date());
      await this.taskService.update(slackTodo.todoapp_reg_id, slackTodo, todoAppAdminUser, correctDelayedCount);
    }

    const superiorUsers = await this.slackRepository.getSuperiorUsers(slackId);

    const sendChannelId = sections.length ? sections[0].channel_id : null; //TODO: 複数sectionにまたがる場合に対応する
    const shareMessage = SlackMessageBuilder.createShareMessage(slackId, slackTodo, repliedMessage);
    await Promise.all(superiorUsers.map(
      su => this.sendShareMessageToChannel(chatTool, su, sendChannelId, null, shareMessage),
    ));

    // await this.replyButtonClick(chatTool, slackId, user, status, channelId, threadId);
  }

  /**
   *
   * @param chatTool
   * @param superiorUser
   * @param channelId
   * @param threadId
   * @param shareMessage
   * @returns
   */
  private async sendShareMessageToChannel(
    chatTool: ChatTool,
    superiorUser: User,
    channelId: string,
    threadId?: string,
    shareMessage?: { blocks: (Block | KnownBlock)[] },
  ): Promise<void> {
    if (!superiorUser.slackId) {
      logger.error(new LoggerError(superiorUser.name + "さんのSLACK IDが設定されていません。"));
      return;
    }

    await this.slackRepository.pushSlackMessage(
      chatTool,
      superiorUser,
      shareMessage,
      MessageTriggerType.REPORT,
      channelId,
      threadId,
    );
  }

  // private async replyButtonClick(
  //   chatTool: ChatTool,
  //   slackId: string,
  //   user: User,
  //   status: string,
  //   channelId: string,
  //   threadId: string,
  // ) {
  //   const actionMatchesStatus = (action: string, statuses: TodoStatus[]): boolean => {
  //     const targetActions = replyActions.filter(a => statuses.includes(a.status)).map(a => a.status);
  //     return targetActions.includes(action as TodoStatus);  // TODO: Convert TodoStatus Enum -> Object literal
  //   };
  //
  //   if (actionMatchesStatus(status, [TodoStatus.DONE])) {
  //     // await this.replyDoneAction(chatTool, user, channelId, threadId);
  //   } else if (actionMatchesStatus(status, [TodoStatus.ONGOING, TodoStatus.NOT_YET])) {
  //     // await this.replyInProgressAction(chatTool, user, channelId, threadId);
  //   } else if (actionMatchesStatus(status, [TodoStatus.DELAYED])) {
  //     // await this.replyDelayAction(chatTool, user, channelId, threadId);
  //   } else if (actionMatchesStatus(status, [TodoStatus.WITHDRAWN])) {
  //     // await this.replyWithdrawnAction(chatTool, user, channelId, threadId);
  //   } else {
  //     console.error(`Status not found: ${status}`);
  //   }
  //
  //   const superiorUsers = await this.slackRepository.getSuperiorUsers(slackId);
  //   const sendChannelId = "C04EJSBAX2S"; //TODO:sectionsTableから取得する
  //   if (superiorUsers) {
  //     await Promise.all(superiorUsers.map(su => this.sendSuperiorMessage(chatTool, su, sendChannelId)));
  //   }
  // }

  // /**
  //  *
  //  * @param chatTool
  //  * @param user
  //  * @param channelId
  //  * @param threadId
  //  * @returns
  //  */
  // private async replyDoneAction(
  //   chatTool: ChatTool,
  //   user: User,
  //   channelId: string,
  //   threadId: string,
  // ): Promise<void> {
  //   const replyMessage = SlackMessageBuilder.createResponseToReplyDone();
  //   await this.slackRepository.replyMessage(chatTool, replyMessage, channelId, threadId, user);
  // }

  // /**
  //  *
  //  * @param chatTool
  //  * @param user
  //  * @param channelId
  //  * @param threadId
  //  * @returns
  //  */
  // private async replyInProgressAction(
  //   chatTool: ChatTool,
  //   user: User,
  //   channelId: string,
  //   threadId: string,
  // ): Promise<void> {
  //   const replyMessage = SlackMessageBuilder.createResponseToReplyInProgress();
  //   await this.slackRepository.replyMessage(chatTool, replyMessage, channelId, threadId, user);
  // }
  //
  // /**
  //  *
  //  * @param chatTool
  //  * @param user
  //  * @param channelId
  //  * @param threadId
  //  * @returns
  //  */
  // private async replyDelayAction(
  //   chatTool: ChatTool,
  //   user: User,
  //   channelId: string,
  //   threadId: string,
  // ): Promise<void> {
  //   const replyMessage = SlackMessageBuilder.createResponseToReplyDelayed();
  //   await this.slackRepository.replyMessage(chatTool, replyMessage, channelId, threadId, user);
  // }
  //
  // /**
  //  *
  //  * @param chatTool
  //  * @param user
  //  * @param channelId
  //  * @param threadId
  //  * @returns
  //  */
  // private async replyWithdrawnAction(
  //   chatTool: ChatTool,
  //   user: User,
  //   channelId: string,
  //   threadId: string,
  // ): Promise<void> {
  //   const replyMessage = SlackMessageBuilder.createResponseToReplyWithdrawn();
  //   await this.slackRepository.replyMessage(chatTool, replyMessage, channelId, threadId, user);
  // }
}