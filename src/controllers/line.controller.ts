import { Route, Controller } from 'tsoa';
import { WebhookEvent, FlexMessage, TextMessage, MessageAPIResponseBase } from '@line/bot-sdk';

import { User } from '../entify/user.entity';
import { LineMessageBuilder } from '../common/line_message';
import { LineBot } from '../config/linebot';
import LineRepository from '../repositories/line.repository';
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
} from '../const/common';
import { ChatMessage } from '../entify/message.entity';
import moment from 'moment';
import logger from './../logger/winston';
import { LoggerError } from '../exceptions';
import { diffDays, toJapanDateTime } from '../utils/common';
import { ChatTool } from '../entify/chat_tool.entity';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/data-source';
import CommonRepository from './../repositories/modules/common.repository';
import { IUser } from '../types';
import LineQuequeRepository from './../repositories/modules/line_queque.repository';
import { Todo } from '../entify/todo.entity';

@Route('line')
export default class LineController extends Controller {
  private lineRepository: LineRepository;
  private chattoolRepository: Repository<ChatTool>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;
  private lineQueueRepository: LineQuequeRepository;

  constructor() {
    super();
    this.lineRepository = Container.get(LineRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.chattoolRepository = AppDataSource.getRepository(ChatTool);
    this.lineQueueRepository = Container.get(LineQuequeRepository);
    this.todoRepository = AppDataSource.getRepository(Todo);
  }

  public async handlerEvents(events: Array<WebhookEvent>): Promise<any> {
    events.map(async (event) => await this.handleEvent(event));

    return {
      message: 'line webhook',
    };
  }

  /**
   * Handle webhook event
   * @param event WebhookEvent
   * @returns
   */
  private async handleEvent(event: WebhookEvent): Promise<any> {
    try {
      const chattool = await this.chattoolRepository.findOneBy({
        tool_code: ChatToolCode.LINE,
      });

      if (!chattool) {
        logger.error(new LoggerError('LINE is not implemented yet!'));
        return;
      }

      const lineId = event.source.userId;

      switch (event.type) {
        case 'follow':
          // LINE Official Account is added as a friend
          // eslint-disable-next-line no-case-declarations
          const lineProfile = await LineBot.getProfile(lineId);
          await this.lineRepository.createLineProfile(lineProfile);
          break;

        case 'message':
          // eslint-disable-next-line no-case-declarations
          const message: any = event.message;
          const messgeContent = message.text.toLowerCase();

          // get user from lineId
          const user = await this.lineRepository.getUserFromLineId(lineId);

          switch (messgeContent) {
            case DONE_MESSAGE:
            case DELAY_MESSAGE:
            case PROGRESS_GOOD_MESSAGE:
            case PROGRESS_BAD_MESSAGE:
            case WITHDRAWN_MESSAGE:
              await this.handleReplyMessage(
                chattool,
                user,
                lineId,
                messgeContent,
                event.replyToken
              );
              break;

            default:
              const unknownMessage = LineMessageBuilder.createUnKnownMessage();
              await this.lineRepository.replyMessage(
                chattool,
                event.replyToken,
                unknownMessage,
                user
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
    chattool: ChatTool,
    user: User,
    lineId: string,
    repliedMessage: string,
    replyToken: string
  ) {
    if (!user) {
      return;
    }

    // get wating queque message
    const waitingReplyQueue = await this.lineQueueRepository.getWaitingQueueTask(user.id);
    if (!waitingReplyQueue) {
      return;
    }

    // update status
    waitingReplyQueue.status = LineMessageQueueStatus.RELIED;
    waitingReplyQueue.updated_at = toJapanDateTime(new Date());
    await this.lineQueueRepository.saveQueue(waitingReplyQueue);
    await this.updateIsReplyFlag(waitingReplyQueue.message_id);

    await this.remindToSuperiorUsers(
      chattool,
      replyToken,
      lineId,
      user,
      repliedMessage,
      waitingReplyQueue.todo,
      waitingReplyQueue.message_id
    );

    const nextQueue = await this.lineQueueRepository.getFirstQueueTaskForSendLine(user.id);

    if (nextQueue && nextQueue.todo) {
      const todo = nextQueue.todo;
      const dayDurations = diffDays(nextQueue.todo.deadline, toJapanDateTime(new Date()));

      const chatMessage = await this.lineRepository.pushMessageRemind(
        chattool,
        { ...user, line_id: lineId },
        todo,
        dayDurations
      );

      // change status
      nextQueue.status = LineMessageQueueStatus.WAITING_REPLY;
      nextQueue.message_id = chatMessage?.id;
      nextQueue.updated_at = toJapanDateTime(new Date());
      await this.lineQueueRepository.saveQueue(nextQueue);

      // reminded_count をカウントアップするのを「期日後のリマインドを送ったとき」のみに限定していただくことは可能でしょうか？
      // 他の箇所（期日前のリマインドを送ったときなど）で reminded_count をカウントアップする処理は、コメントアウトする形で残しておいていただけますと幸いです。
      if (dayDurations > 0) {
        todo.reminded_count = todo.reminded_count + 1;
      }

      await this.todoRepository.save(todo);
    }
  }

  private async remindToSuperiorUsers(
    chattool: ChatTool,
    replyToken: string,
    lineId: string,
    user: User,
    replyMessage: string,
    todo: Todo,
    messageParentId: number
  ) {
    const superiorUsers = await this.lineRepository.getSuperiorUsers(lineId);

    if (superiorUsers.length == 0) {
      switch (replyMessage) {
        case DONE_MESSAGE:
          await this.replyDoneAction(chattool, user, replyToken);
          break;
        case PROGRESS_GOOD_MESSAGE:
        case PROGRESS_BAD_MESSAGE:
          await this.replyInProgressAction(chattool, user, replyToken);
          break;
        case DELAY_MESSAGE:
          await this.replyDelayAction(chattool, user, replyToken);
          break;
        case WITHDRAWN_MESSAGE:
          await this.replyWithdrawnAction(chattool, user, replyToken);
          break;
        default:
          break;
      }
    } else {
      superiorUsers.map(async (superiorUser) => {
        switch (replyMessage) {
          case DONE_MESSAGE:
            await this.replyDoneAction(chattool, user, replyToken, superiorUser.name);
            break;
          case PROGRESS_GOOD_MESSAGE:
          case PROGRESS_BAD_MESSAGE:
            await this.replyInProgressAction(chattool, user, replyToken, superiorUser.name);
            break;
          case DELAY_MESSAGE:
            await this.replyDelayAction(chattool, user, replyToken);
            break;
          case WITHDRAWN_MESSAGE:
            await this.replyWithdrawnAction(chattool, user, replyToken);
            break;
          default:
            break;
        }
        await this.saveChatMessage(
          chattool,
          todo,
          user.id,
          messageParentId,
          replyMessage,
          replyToken,
          MessageTriggerType.REPLY
        );

        await this.sendSuperiorMessage(chattool, superiorUser, user.name, todo?.name, replyMessage);
      });
    }
  }

  /**
   * Save chat message
   * @returns
   * @param chattool
   * @param todo
   * @param userId
   * @param messageParentId
   * @param messageContent
   * @param messageToken
   * @param messageTriggerId
   */
  private async saveChatMessage(
    chattool: ChatTool,
    todo: Todo,
    userId: number,
    messageParentId: number,
    messageContent: string,
    messageToken: string,
    messageTriggerId: number
  ): Promise<ChatMessage> {
    const chatMessage = new ChatMessage();
    chatMessage.is_from_user = SenderType.FROM_USER;
    chatMessage.chattool_id = chattool.id;
    chatMessage.is_openned = OpenStatus.OPENNED;
    chatMessage.is_replied = ReplyStatus.NOT_REPLIED;
    chatMessage.message_trigger_id = messageTriggerId; // reply
    chatMessage.message_type_id = MessageType.TEXT;

    chatMessage.body = messageContent;
    chatMessage.todo_id = todo?.id;
    chatMessage.send_at = toJapanDateTime(
      moment()
        .utc()
        .toDate()
    );
    chatMessage.message_token = messageToken;
    chatMessage.user_id = userId;
    chatMessage.parent_message_id = messageParentId;

    return await this.lineRepository.createMessage(chatMessage);
  }

  /**
   *
   * @param chattool
   * @param replyToken
   * @param lineId
   * @returns
   */
  private async replyClientId(
    chattool: ChatTool,
    replyToken: string,
    lineId: string
  ): Promise<MessageAPIResponseBase> {
    const textMessage: TextMessage = {
      type: 'text',
      text: 'あなたのLineIDをお知らせます。\n' + lineId,
    };
    return await this.lineRepository.replyMessage(chattool, replyToken, textMessage);
  }

  /**
   *
   * @param chattool
   * @param user
   * @param replyToken
   * @param superior
   * @returns
   */
  private async replyDoneAction(
    chattool: ChatTool,
    user: User,
    replyToken: string,
    superior?: string
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: FlexMessage = LineMessageBuilder.createReplyDoneMessage(superior);
    return await this.lineRepository.replyMessage(chattool, replyToken, replyMessage, user);
  }

  /**
   *
   * @param chattool
   * @param user
   * @param replyToken
   * @param superior
   * @returns
   */
  private async replyInProgressAction(
    chattool: ChatTool,
    user: User,
    replyToken: string,
    superior?: string
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: FlexMessage = LineMessageBuilder.createReplyInProgressMessage(superior);
    return await this.lineRepository.replyMessage(chattool, replyToken, replyMessage, user);
  }

  /**
   *
   * @param chattool
   * @param user
   * @param replyToken
   * @returns
   */
  private async replyDelayAction(
    chattool: ChatTool,
    user: User,
    replyToken: string
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: FlexMessage = LineMessageBuilder.createDelayReplyMessage();
    return await this.lineRepository.replyMessage(chattool, replyToken, replyMessage, user);
  }

  /**
   *
   * @param chattool
   * @param user
   * @param replyToken
   * @returns
   */
  private async replyWithdrawnAction(
    chattool: ChatTool,
    user: User,
    replyToken: string
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: FlexMessage = LineMessageBuilder.createWithdrawnReplyMessage();
    return await this.lineRepository.replyMessage(chattool, replyToken, replyMessage, user);
  }

  private async updateIsReplyFlag(messageId: number) {
    const message = await this.lineRepository.findMessageById(messageId);

    if (message) {
      message.is_replied = ReplyStatus.REPLIED;

      await this.lineRepository.createMessage(message);
    }
  }

  /**
   *
   * @param chattool
   * @param superiorUser
   * @param userName
   * @param taskName
   * @param reportContent
   * @returns
   */
  private async sendSuperiorMessage(
    chattool: ChatTool,
    superiorUser: IUser,
    userName: string,
    taskName: string,
    reportContent: string
  ): Promise<MessageAPIResponseBase> {
    const chatToolUser = await this.commonRepository.getChatToolUser(superiorUser.id, chattool.id);
    const user = { ...superiorUser, line_id: chatToolUser?.auth_key };

    if (!chatToolUser?.auth_key) {
      logger.error(new LoggerError(user.name + 'さんのLINE IDが設定されていません。'));
      return;
    }

    await this.lineRepository.pushStartReportToSuperior(chattool, user);

    const reportMessage: FlexMessage = LineMessageBuilder.createReportToSuperiorMessage(
      user.name,
      userName,
      taskName,
      reportContent
    );
    return await this.lineRepository.pushLineMessage(
      chattool,
      user,
      reportMessage,
      MessageTriggerType.ACTION
    );
  }
}
