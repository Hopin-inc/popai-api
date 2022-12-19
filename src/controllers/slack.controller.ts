import { Route, Controller } from 'tsoa';

import { User } from '../entify/user.entity';
import { SlackBot } from '../config/slackbot';
import SlackRepository from '../repositories/slack.repository';
import Container from 'typedi';
import {
  ChatToolCode,
  DELAY_MESSAGE,
  DONE_MESSAGE,
  PROGRESS_BAD_MESSAGE,
  PROGRESS_GOOD_MESSAGE,
  WITHDRAWN_MESSAGE,
  LineMessageQueueStatus,
  MessageTriggerType,
  MessageType,
  OpenStatus,
  ReplyStatus,
  SenderType,
  REMIND_ME_COMMAND,
} from '../const/common';
import { ChatMessage } from '../entify/message.entity';
import moment from 'moment';
import logger from '../logger/winston';
import { LoggerError } from '../exceptions';
import { diffDays, toJapanDateTime } from '../utils/common';
import { ChatTool } from '../entify/chat_tool.entity';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import CommonRepository from '../repositories/modules/common.repository';
import { IUser } from '../types';
import SlackQueueRepository from '../repositories/modules/slackQueque.repository';
import { Todo } from '../entify/todo.entity';
import TaskService from '../services/task.service';
import { IncomingWebhook } from '@slack/web-api/dist/response/OauthAccessResponse';
import { SlackMessageBuilder } from '../common/slack_message';

@Route('slack')
export default class SlackController extends Controller {
  private SlackRepository: SlackRepository;
  private chatToolRepository: Repository<ChatTool>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;
  private SlackQueueRepository: SlackQueueRepository;
  private taskService: TaskService;

  constructor() {
    super();
    this.SlackRepository = Container.get(SlackRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.chatToolRepository = AppDataSource.getRepository(ChatTool);
    this.SlackQueueRepository = Container.get(SlackQueueRepository);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.taskService = Container.get(TaskService);
  }

  async handleEvent(event: IncomingWebhook): Promise<any> {
    try {
      const chatTool = await this.chatToolRepository.findOneBy({
        tool_code: ChatToolCode.SLACK,
      });

      if (!chatTool) {
        logger.error(new LoggerError('SLACK is not implemented yet!'));
        return;
      }

      const configurationlUrl = event.configuration_url;

      switch (event) {
        case 'follow':
          // LINE Official Account is added as a friend
          // eslint-disable-next-line no-case-declarations
          const slackProfile = await SlackBot.getProfile(slackId);
          await this.SlackRepository.createSlackProfile(slackProfile);
          break;

        case 'postback':
          if (event.postback.data == REMIND_ME_COMMAND) {
            // get user from lineId
            const user = await this.SlackRepository.getUserFromLineId(slackId);

            if (user) {
              await this.replyProcessingJob(chatTool, user, event.replyToken);

              // execute remind
              await this.taskService.remindTaskForDemoUser(user);
            } else {
              console.error('Line ID :' + lineId + 'のアカウントが登録されていません。');
            }
          }
          break;

        case 'message':
          // eslint-disable-next-line no-case-declarations
          const message: any = event.message;
          const messgeContent = message.text.toLowerCase();

          // get user from lineId
          const user = await this.SlackRepository.getUserFromLineId(lineId);

          switch (messgeContent) {
            case DONE_MESSAGE:
            case DELAY_MESSAGE:
            case PROGRESS_GOOD_MESSAGE:
            case PROGRESS_BAD_MESSAGE:
            case WITHDRAWN_MESSAGE:
              await this.handleReplyMessage(
                chatTool,
                user,
                lineId,
                messgeContent,
                event.replyToken,
              );
              break;

            default:
              const unknownMessage = SlackMessageBuilder.createUnKnownMessage();
              await this.SlackRepository.replyMessage(
                chatTool,
                event.replyToken,
                unknownMessage,
                user,
              );
              break;
          }
      }

      return;
    } catch (error) {
      console.error(error);
    }
  }

  private async handleReplyMessage(
    chatTool: ChatTool,
    user: User,
    lineId: string,
    repliedMessage: string,
    replyToken: string,
  ) {
    if (!user) {
      return;
    }

    // get waiting queue message
    const waitingReplyQueue = await this.slackQueueRepository.getWaitingQueueTask(user.id);
    if (!waitingReplyQueue) {
      return;
    }

    // update status
    waitingReplyQueue.status = LineMessageQueueStatus.REPLIED;
    waitingReplyQueue.updated_at = toJapanDateTime(new Date());
    const sectionId = waitingReplyQueue.todo.section_id;
    const todoAppId = waitingReplyQueue.todo.todoapp_id;
    const boardAdminUser = await this.commonRepository.getBoardAdminUser(sectionId);
    const todoAppAdminUser = boardAdminUser.todoAppUsers.find(tau => tau.todoapp_id === todoAppId);
    if (repliedMessage === DONE_MESSAGE) {
      waitingReplyQueue.todo.is_done = true;
      const todo = waitingReplyQueue.todo;
      const correctDelayedCount = todo.deadline < waitingReplyQueue.remind_date;
      await this.taskService.updateTask(todo.todoapp_reg_id, todo, todoAppAdminUser, correctDelayedCount);
    }
    await this.slackQueueRepository.saveQueue(waitingReplyQueue);
    await this.updateIsReplyFlag(waitingReplyQueue.message_id);

    await this.remindToSuperiorUsers(
      chatTool,
      replyToken,
      lineId,
      user,
      repliedMessage,
      waitingReplyQueue.todo,
      waitingReplyQueue.message_id,
    );

    const nextQueue = await this.slackQueueRepository.getFirstQueueTaskForSendLine(user.id);

    if (nextQueue && nextQueue.todo) {
      const todo = nextQueue.todo;
      const dayDurations = diffDays(nextQueue.todo.deadline, toJapanDateTime(new Date()));

      const chatMessage = await this.SlackRepository.pushMessageRemind(
        chatTool,
        { ...user, line_id: lineId },
        todo,
        dayDurations,
      );

      // change status
      nextQueue.status = LineMessageQueueStatus.WAITING_REPLY;
      nextQueue.message_id = chatMessage?.id;
      nextQueue.updated_at = toJapanDateTime(new Date());
      await this.slackQueueRepository.saveQueue(nextQueue);

      // reminded_count をカウントアップするのを「期日後のリマインドを送ったとき」のみに限定していただくことは可能でしょうか？
      // 他の箇所（期日前のリマインドを送ったときなど）で reminded_count をカウントアップする処理は、コメントアウトする形で残しておいていただけますと幸いです。
      if (dayDurations > 0) {
        todo.reminded_count = todo.reminded_count + 1;
      }

      await this.todoRepository.save(todo);
    }
  }

  private async remindToSuperiorUsers(
    chatTool: ChatTool,
    replyToken: string,
    lineId: string,
    user: User,
    replyMessage: string,
    todo: Todo,
    messageParentId: number,
  ) {
    const superiorUsers = await this.SlackRepository.getSuperiorUsers(lineId);

    if (superiorUsers.length == 0) {
      switch (replyMessage) {
        case DONE_MESSAGE:
          await this.replyDoneAction(chatTool, user, replyToken);
          break;
        case PROGRESS_GOOD_MESSAGE:
        case PROGRESS_BAD_MESSAGE:
          await this.replyInProgressAction(chatTool, user, replyToken);
          break;
        case DELAY_MESSAGE:
          await this.replyDelayAction(chatTool, user, replyToken);
          break;
        case WITHDRAWN_MESSAGE:
          await this.replyWithdrawnAction(chatTool, user, replyToken);
          break;
        default:
          break;
      }
    } else {
      superiorUsers.map(async (superiorUser) => {
        switch (replyMessage) {
          case DONE_MESSAGE:
            await this.replyDoneAction(chatTool, user, replyToken, superiorUser.name);
            break;
          case PROGRESS_GOOD_MESSAGE:
          case PROGRESS_BAD_MESSAGE:
            await this.replyInProgressAction(chatTool, user, replyToken, superiorUser.name);
            break;
          case DELAY_MESSAGE:
            await this.replyDelayAction(chatTool, user, replyToken);
            break;
          case WITHDRAWN_MESSAGE:
            await this.replyWithdrawnAction(chatTool, user, replyToken);
            break;
          default:
            break;
        }
        await this.saveChatMessage(
          chatTool,
          todo,
          user.id,
          messageParentId,
          replyMessage,
          replyToken,
          MessageTriggerType.REPLY,
        );

        await this.sendSuperiorMessage(chatTool, superiorUser, user.name, todo?.name, replyMessage);
      });
    }
  }

  /**
   * Save chat message
   * @returns
   * @param chatTool
   * @param todo
   * @param userId
   * @param messageParentId
   * @param messageContent
   * @param messageToken
   * @param messageTriggerId
   */
  private async saveChatMessage(
    chatTool: ChatTool,
    todo: Todo,
    userId: number,
    messageParentId: number,
    messageContent: string,
    messageToken: string,
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
    chatMessage.message_token = messageToken;
    chatMessage.user_id = userId;
    chatMessage.parent_message_id = messageParentId;

    return await this.SlackRepository.createMessage(chatMessage);
  }

  /**
   *
   * @param chatTool
   * @param replyToken
   * @param lineId
   * @returns
   */
  private async replyClientId(
    chatTool: ChatTool,
    replyToken: string,
    lineId: string,
  ): Promise<MessageAPIResponseBase> {
    const textMessage: TextMessage = {
      type: 'text',
      text: 'あなたのLineIDをお知らせます。\n' + lineId,
    };
    return await this.SlackRepository.replyMessage(chatTool, replyToken, textMessage);
  }

  /**
   *
   * @param chatTool
   * @param user
   * @param replyToken
   * @param superior
   * @returns
   */
  private async replyDoneAction(
    chatTool: ChatTool,
    user: User,
    replyToken: string,
    superior?: string,
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: FlexMessage = SlackMessageBuilder.createReplyDoneMessage(superior);
    return await this.SlackRepository.replyMessage(chatTool, replyToken, replyMessage, user);
  }

  /**
   *
   * @param chatTool
   * @param user
   * @param replyToken
   * @param superior
   * @returns
   */
  private async replyInProgressAction(
    chatTool: ChatTool,
    user: User,
    replyToken: string,
    superior?: string,
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: FlexMessage = SlackMessageBuilder.createReplyInProgressMessage(superior);
    return await this.SlackRepository.replyMessage(chatTool, replyToken, replyMessage, user);
  }

  /**
   *
   * @param chatTool
   * @param user
   * @param replyToken
   * @returns
   */
  private async replyDelayAction(
    chatTool: ChatTool,
    user: User,
    replyToken: string,
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: FlexMessage = SlackMessageBuilder.createDelayReplyMessage();
    return await this.SlackRepository.replyMessage(chatTool, replyToken, replyMessage, user);
  }

  /**
   *
   * @param chatTool
   * @param user
   * @param replyToken
   * @returns
   */
  private async replyWithdrawnAction(
    chatTool: ChatTool,
    user: User,
    replyToken: string,
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: FlexMessage = SlackMessageBuilder.createWithdrawnReplyMessage();
    return await this.SlackRepository.replyMessage(chatTool, replyToken, replyMessage, user);
  }

  private async replyProcessingJob(
    chatTool: ChatTool,
    user: User,
    replyToken: string,
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: FlexMessage = SlackMessageBuilder.createProcessingJobReplyMessage();
    return await this.SlackRepository.replyMessage(chatTool, replyToken, replyMessage, user);
  }

  private async updateIsReplyFlag(messageId: number) {
    const message = await this.SlackRepository.findMessageById(messageId);

    if (message) {
      message.is_replied = ReplyStatus.REPLIED;

      await this.SlackRepository.createMessage(message);
    }
  }

  /**
   *
   * @param chatTool
   * @param superiorUser
   * @param userName
   * @param taskName
   * @param reportContent
   * @returns
   */
  private async sendSuperiorMessage(
    chatTool: ChatTool,
    superiorUser: IUser,
    userName: string,
    taskName: string,
    reportContent: string,
  ): Promise<MessageAPIResponseBase> {
    const chatToolUser = await this.commonRepository.getChatToolUser(superiorUser.id, chatTool.id);
    const user = { ...superiorUser, line_id: chatToolUser?.auth_key };

    if (!chatToolUser?.auth_key) {
      logger.error(new LoggerError(user.name + 'さんのLINE IDが設定されていません。'));
      return;
    }

    await this.SlackRepository.pushStartReportToSuperior(chatTool, user);

    const reportMessage: FlexMessage = SlackMessageBuilder.createReportToSuperiorMessage(
      user.name,
      userName,
      taskName,
      reportContent,
    );
    return await this.SlackRepository.pushLineMessage(
      chatTool,
      user,
      reportMessage,
      MessageTriggerType.ACTION,
    );
  }
}