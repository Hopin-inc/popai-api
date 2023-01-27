import { Controller } from "tsoa";
import Container from "typedi";
import { Repository } from "typeorm";

import ChatTool from "@/entities/ChatTool";
import User from "@/entities/User";
import Todo from "@/entities/Todo";

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
import { replyActions } from "@/consts/slack";
import { IUser } from "@/types";

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

  async handleEvent(payload: any) { // TODO: Define type
    try {
      const chatTool = await this.chatToolRepository.findOneBy({
        tool_code: ChatToolCode.SLACK,
      });

      if (!chatTool) {
        logger.error(new LoggerError("SLACK is not implemented yet!"));
        return;
      }

      if (payload.type === "block_actions") {
        const { user, container, actions } = payload;
        if (!actions.length) {
          return;
        }

        const slackId = user.id;
        const repliedMessage = actions[0].text.text.toLowerCase();
        const status = actions[0].value;
        const slackUser = await this.slackRepository.getUserFromSlackId(slackId);

        const channelId = container.channel_id;
        const threadId = container.message_ts;

        await this.handleReplyMessage(chatTool, slackUser, slackId, repliedMessage, status, channelId, threadId);
      } else {
        logger.error(new LoggerError("Unknown Response"));
      }
      return { message: "slack webhook" };
    } catch (error) {
      console.error(error);
    }
  }

  private async handleReplyMessage(
    chatTool: ChatTool,
    user: User,
    slackId: string,
    repliedMessage: string,
    status: string,
    channelId: string,
    threadId: string,
  ) {
    if (!user) {
      return;
    }

    const slackTodo = await this.slackRepository.getSlackTodo(channelId, threadId);
    console.dir(slackTodo, { depth: null });

    await SlackBot.chat.update({
      channel: channelId,
      ts: threadId,
      text: repliedMessage,
      blocks: SlackMessageBuilder.createReplaceMessageAfterReply(slackId, slackTodo, repliedMessage).blocks,
    });

    const sections = slackTodo.sections;
    const sectionId = sections.length ? sections[0].id : null;
    const todoAppId = slackTodo.todoapp_id;
    const boardAdminUser = await this.commonRepository.getBoardAdminUser(sectionId);
    const todoAppAdminUser = boardAdminUser.todoAppUsers.find(tau => tau.todoapp_id === todoAppId);
    const doneActions = replyActions.filter(m => m.status === TodoStatus.DONE).map(m => m.text);
    if (doneActions.includes(repliedMessage)) {
      slackTodo.is_done = true;
      const correctDelayedCount = slackTodo.deadline < toJapanDateTime(new Date());
      await this.taskService.updateTask(slackTodo.todoapp_reg_id, slackTodo, todoAppAdminUser, correctDelayedCount);
    }

    await this.replyButtonClick(chatTool, slackId, user, status, channelId, threadId);
  }

  private async replyButtonClick(
    chatTool: ChatTool,
    slackId: string,
    user: User,
    status: string,
    channelId: string,
    threadId: string,
  ) {
    const actionMatchesStatus = (action: string, statuses: TodoStatus[]): boolean => {
      const targetActions = replyActions.filter(a => statuses.includes(a.status)).map(a => a.status);
      return targetActions.includes(action as TodoStatus);  // TODO: Convert TodoStatus Enum -> Object literal
    };

    if (actionMatchesStatus(status, [TodoStatus.DONE])) {
      await this.replyDoneAction(chatTool, user, channelId, threadId);
    } else if (actionMatchesStatus(status, [TodoStatus.ONGOING, TodoStatus.NOT_YET])) {
      await this.replyInProgressAction(chatTool, user, channelId, threadId);
    } else if (actionMatchesStatus(status, [TodoStatus.DELAYED])) {
      await this.replyDelayAction(chatTool, user, channelId, threadId);
    } else if (actionMatchesStatus(status, [TodoStatus.WITHDRAWN])) {
      await this.replyWithdrawnAction(chatTool, user, channelId, threadId);
    } else {
      console.error(`Status not found: ${status}`);
    }

    const superiorUsers = await this.slackRepository.getSuperiorUsers(slackId);
    if (superiorUsers) {
      await Promise.all(superiorUsers.map(su => this.sendSuperiorMessage(chatTool, su, channelId, threadId)));
    }
  }

  /**
   *
   * @param chatTool
   * @param user
   * @param channelId
   * @param threadId
   * @returns
   */
  private async replyDoneAction(
    chatTool: ChatTool,
    user: User,
    channelId: string,
    threadId: string,
  ): Promise<void> {
    const replyMessage = SlackMessageBuilder.createResponseToReplyDone();
    await this.slackRepository.replyMessage(chatTool, replyMessage, channelId, threadId, user);
  }

  /**
   *
   * @param chatTool
   * @param user
   * @param channelId
   * @param threadId
   * @returns
   */
  private async replyInProgressAction( // TODO: channelIdとthreadIdでpostする
    chatTool: ChatTool,
    user: User,
    channelId: string,
    threadId: string,
  ): Promise<void> {
    const replyMessage = SlackMessageBuilder.createResponseToReplyInProgress();
    await this.slackRepository.replyMessage(chatTool, replyMessage, channelId, threadId, user);
  }

  /**
   *
   * @param chatTool
   * @param user
   * @param channelId
   * @param threadId
   * @returns
   */
  private async replyDelayAction( // TODO: channelIdとthreadIdでpostする
    chatTool: ChatTool,
    user: User,
    channelId: string,
    threadId: string,
  ): Promise<void> {
    const replyMessage = SlackMessageBuilder.createResponseToReplyDelayed();
    await this.slackRepository.replyMessage(chatTool, replyMessage, channelId, threadId, user);
  }

  /**
   *
   * @param chatTool
   * @param user
   * @param channelId
   * @param threadId
   * @returns
   */
  private async replyWithdrawnAction(
    chatTool: ChatTool,
    user: User,
    channelId: string,
    threadId: string,
  ): Promise<void> {
    const replyMessage = SlackMessageBuilder.createResponseToReplyWithdrawn();
    await this.slackRepository.replyMessage(chatTool, replyMessage, channelId, threadId, user);
  }

  /**
   *
   * @param chatTool
   * @param superiorUser
   * @param channelId
   * @param threadId
   * @returns
   */
  private async sendSuperiorMessage(
    chatTool: ChatTool,
    superiorUser: IUser,
    channelId: string,
    threadId: string,
  ): Promise<void> {
    const chatToolUser = await this.commonRepository.getChatToolUser(superiorUser.id, chatTool.id);
    const user = { ...superiorUser, slack_id: chatToolUser?.auth_key };

    if (!chatToolUser?.auth_key) {
      logger.error(new LoggerError(user.name + "さんのSLACK IDが設定されていません。"));
      return;
    }

    const reportMessage = SlackMessageBuilder.createReportMessage(user);
    await this.slackRepository.pushSlackMessage(
      chatTool,
      user,
      reportMessage,
      MessageTriggerType.ACTION,
      channelId,
      threadId
    );
  }
}