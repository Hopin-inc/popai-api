// noinspection DuplicatedCode

import { Route, Controller } from 'tsoa';

import { User } from '../entify/user.entity';
import SlackRepository from '../repositories/slack.repository';
import Container from 'typedi';
import {
  ChatToolCode,
  DELAY_MESSAGE,
  DONE_MESSAGE,
  PROGRESS_BAD_MESSAGE,
  PROGRESS_GOOD_MESSAGE,
  WITHDRAWN_MESSAGE,
  MessageTriggerType,
  MessageType,
  OpenStatus,
  ReplyStatus,
  SenderType,
} from '../const/common';
import { ChatMessage } from '../entify/message.entity';
import moment from 'moment';
import logger from '../logger/winston';
import { LoggerError } from '../exceptions';
import { toJapanDateTime } from '../utils/common';
import { ChatTool } from '../entify/chat_tool.entity';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import CommonRepository from '../repositories/modules/common.repository';
import { IUser } from '../types';
import { Todo } from '../entify/todo.entity';
import TaskService from '../services/task.service';
import { SlackMessageBuilder } from '../common/slack_message';
import { MessageAttachment } from '@slack/web-api';
import { SlackBot } from '../config/slackbot';

@Route('slack')
export default class SlackController extends Controller {
  private SlackRepository: SlackRepository;
  private chatToolRepository: Repository<ChatTool>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;
  private taskService: TaskService;

  constructor() {
    super();
    this.SlackRepository = Container.get(SlackRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.chatToolRepository = AppDataSource.getRepository(ChatTool);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.taskService = Container.get(TaskService);
  }

  async handleEvent(payload: any): Promise<any> {
    try {
      const chatTool = await this.chatToolRepository.findOneBy({
        tool_code: ChatToolCode.SLACK,
      });

      if (!chatTool) {
        logger.error(new LoggerError('SLACK is not implemented yet!'));
        return;
      }

      if (payload.type === 'block_actions') {
        const { user, container, actions } = payload;

        const slackId = user.id;
        const rawRepliedMessage = actions[0].text.text.toLowerCase();
        const slackUser = await this.SlackRepository.getUserFromSlackId(slackId);

        const channelId = container.channel_id;
        const threadId = container.message_ts;

        this.replaceMessage(rawRepliedMessage).then((repliedMessage) =>{
        switch (repliedMessage) {
          case DONE_MESSAGE:
          case DELAY_MESSAGE:
          case PROGRESS_GOOD_MESSAGE:
          case PROGRESS_BAD_MESSAGE:
          case WITHDRAWN_MESSAGE:
            this.handleReplyMessage(
              chatTool,
              slackUser,
              slackId,
              repliedMessage,
              channelId,
              threadId,
            );
            break;
        }});
      } else {
        logger.error(new LoggerError('Unknown Response'));
      }
      return;
    } catch (error) {
      console.error(error);
    }
  }

private async replaceMessage(message: string) {
  let modifiedMessage = '';

  modifiedMessage = message.replace(':+1:', '👍');
  modifiedMessage = modifiedMessage.replace(':おじぎ_男性:', '🙇‍♂️');
  modifiedMessage = modifiedMessage.replace(':ピカピカ:', '✨');
  modifiedMessage = modifiedMessage.replace(':大泣き:', '😭');
  modifiedMessage = modifiedMessage.replace(':しずく:', '💧');

  return modifiedMessage;
}


  private async handleReplyMessage(
    chatTool: ChatTool,
    user: User,
    slackId: string,
    repliedMessage: string,
    channelId: string,
    threadId: string,
  ) {
    if (!user) {
      return;
    }

    const slackTodo = await this.SlackRepository.getSlackTodo(channelId, threadId);
    console.dir(slackTodo, { depth: null });

    await SlackBot.chat.update({
      channel: channelId,
      ts: threadId,
      text: repliedMessage,
      blocks: SlackMessageBuilder.createReplaceMessage(slackId, slackTodo, repliedMessage).blocks,
    });

    const sectionId = slackTodo.section_id;
    const todoAppId = slackTodo.todoapp_id;
    const boardAdminUser = await this.commonRepository.getBoardAdminUser(sectionId);
    const todoAppAdminUser = boardAdminUser.todoAppUsers.find(tau => tau.todoapp_id === todoAppId);
    if (repliedMessage === DONE_MESSAGE) {
      slackTodo.is_done = true;
      const correctDelayedCount = slackTodo.deadline < toJapanDateTime(new Date());
      await this.taskService.updateTask(slackTodo.todoapp_reg_id, slackTodo, todoAppAdminUser, correctDelayedCount);
    }

    await this.replyButtonClick(
      chatTool,
      slackId,
      user,
      repliedMessage,
      slackTodo,
      channelId,
      threadId,
    );
  }

  private async replyButtonClick(
    chatTool: ChatTool,
    slackId: string,
    user: User,
    replyMessage: string,
    todo: Todo,
    channelId: string,
    threadId: string,
  ) {
    const superiorUsers = await this.SlackRepository.getSuperiorUsers(slackId);

    if (superiorUsers.length == 0) {
      switch (replyMessage) {
        case DONE_MESSAGE:
          await this.replyDoneAction(chatTool, user, channelId, threadId);
          break;
        case PROGRESS_GOOD_MESSAGE:
        case PROGRESS_BAD_MESSAGE:
          await this.replyInProgressAction(chatTool, user, channelId, threadId);
          break;
        case DELAY_MESSAGE:
          await this.replyDelayAction(chatTool, user, channelId, threadId);
          break;
        case WITHDRAWN_MESSAGE:
          await this.replyWithdrawnAction(chatTool, user, channelId, threadId);
          break;
        default:
          break;
      }
    } else {
      superiorUsers.map(async (superiorUser) => {
        switch (replyMessage) {
          case DONE_MESSAGE:
            await this.replyDoneAction(chatTool, user, channelId, threadId);
            break;
          case PROGRESS_GOOD_MESSAGE:
          case PROGRESS_BAD_MESSAGE:
            await this.replyInProgressAction(chatTool, user, channelId, threadId);
            break;
          case DELAY_MESSAGE:
            await this.replyDelayAction(chatTool, user, channelId, threadId);
            break;
          case WITHDRAWN_MESSAGE:
            await this.replyWithdrawnAction(chatTool, user, channelId, threadId);
            break;
          default:
            break;
        }
        await this.saveChatMessage(
          chatTool,
          todo,
          user.id,
          threadId,
          channelId,
          replyMessage,
          MessageTriggerType.REPLY,
        );

        await this.sendSuperiorMessage(chatTool, superiorUser, channelId, threadId);
      });
    }
  }

  /**
   * Save chat message
   * @returns
   * @param chatTool
   * @param todo
   * @param userId
   * @param threadId
   * @param channelId
   * @param messageContent
   * @param messageTriggerId
   */
  private async saveChatMessage(
    chatTool: ChatTool,
    todo: Todo,
    userId: number,
    threadId: string,
    channelId: string,
    messageContent: string,
    messageTriggerId: number,
  ): Promise<ChatMessage> {
    const chatMessage = new ChatMessage();
    chatMessage.is_from_user = SenderType.FROM_USER;
    chatMessage.chatTool_id = chatTool.id;
    chatMessage.is_openned = OpenStatus.OPENNED;
    chatMessage.is_replied = ReplyStatus.NOT_REPLIED;
    chatMessage.message_trigger_id = messageTriggerId; // reply
    chatMessage.message_type_id = MessageType.TEXT;

    chatMessage.body = messageContent;
    chatMessage.todo_id = todo?.id;
    chatMessage.send_at = toJapanDateTime(
      moment()
        .utc()
        .toDate(),
    );
    chatMessage.user_id = userId;
    chatMessage.thread_id = threadId;
    chatMessage.channel_id = channelId;

    return await this.SlackRepository.createMessage(chatMessage);
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
  ): Promise<MessageAttachment> {
    const replyMessage = SlackMessageBuilder.createReplyDoneMessage();
    return await this.SlackRepository.replyMessage(chatTool, replyMessage, channelId, threadId, user);
  }

  /**
   *
   * @param chatTool
   * @param user
   * @param channelId
   * @param threadId
   * @returns
   */
  private async replyInProgressAction( //TODO:channelIdとthreadIdでpostする
    chatTool: ChatTool,
    user: User,
    channelId: string,
    threadId: string,
  ): Promise<MessageAttachment> {
    const replyMessage = SlackMessageBuilder.createReplyInProgressMessage();
    return await this.SlackRepository.replyMessage(chatTool, replyMessage, channelId, threadId, user);
  }

  /**
   *
   * @param chatTool
   * @param user
   * @param channelId
   * @param threadId
   * @returns
   */
  private async replyDelayAction( //TODO:channelIdとthreadIdでpostする
    chatTool: ChatTool,
    user: User,
    channelId: string,
    threadId: string,
  ): Promise<MessageAttachment> {
    const replyMessage = SlackMessageBuilder.createDelayReplyMessage();
    return await this.SlackRepository.replyMessage(chatTool, replyMessage, channelId, threadId, user);
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
  ): Promise<MessageAttachment> {
    const replyMessage = SlackMessageBuilder.createWithdrawnReplyMessage();
    return await this.SlackRepository.replyMessage(chatTool, replyMessage, channelId, threadId, user);
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
  ): Promise<MessageAttachment> {
    const chatToolUser = await this.commonRepository.getChatToolUser(superiorUser.id, chatTool.id);
    const user = { ...superiorUser, slack_id: chatToolUser?.auth_key };

    if (!chatToolUser?.auth_key) {
      logger.error(new LoggerError(user.name + 'さんのSLACK IDが設定されていません。'));
      return;
    }

    const reportMessage = SlackMessageBuilder.createReportToSuperiorMessage(user.slack_id);
    console.log(reportMessage, channelId, threadId);
    return await this.SlackRepository.pushSlackMessage(
      chatTool,
      user,
      reportMessage,
      MessageTriggerType.ACTION,
      channelId,
      threadId,
    );
  }
}