import { Route, Controller } from 'tsoa';
import {
  WebhookEvent,
  FlexMessage,
  TextMessage,
  PostbackEvent,
  MessageAPIResponseBase,
} from '@line/bot-sdk';

import { User } from '../entify/user.entity';
import { LineMessageBuilder } from '../common/line_message';
import { LineBot } from '../config/linebot';
import LineRepository from '../repositories/line.repository';
import Container from 'typedi';
import {
  ChatToolCode,
  DELAY_MESSAGE,
  DONE_MESSAGE,
  LINEID_MESSAGE,
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
import { IUser } from './../types';
import LineQuequeRepository from './../repositories/modules/line_queque.repository';
import { Todo } from './../entify/todo.entity';

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

          await this.replyClientId(chattool, event.replyToken, lineId);

          break;

        case 'message':
          // eslint-disable-next-line no-case-declarations
          const message: any = event.message;
          const messgeContent = message.text.toLowerCase();

          // get user from lineId
          const user = await this.lineRepository.getUserFromLineId(lineId);

          switch (messgeContent) {
            case LINEID_MESSAGE:
              await this.replyClientId(chattool, event.replyToken, lineId);
              break;

            case DONE_MESSAGE:
              await this.handleReplyMessage(
                chattool,
                user,
                lineId,
                messgeContent,
                event.replyToken
              );
              break;

            case DELAY_MESSAGE:
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

      await this.lineQueueRepository.saveQueue(nextQueue);
      await this.todoRepository.save({
        ...todo,
        reminded_count: todo.reminded_count + 1,
      });
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
      if (replyMessage == DONE_MESSAGE) {
        await this.replyDoneAction(chattool, user, replyToken, '');
      } else {
        await this.replyDeplayAction(chattool, user, replyToken);
      }
    } else {
      superiorUsers.map(async (superiorUser) => {
        if (replyMessage == DONE_MESSAGE) {
          await this.replyDoneAction(chattool, user, replyToken, superiorUser.name);
        } else {
          await this.replyDeplayAction(chattool, user, replyToken);
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
   * @param postData
   * @param event
   * @returns
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
   * @param replyToken
   * @returns
   */
  private async replyDeplayAction(
    chattool: ChatTool,
    user: User,
    replyToken: string
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: FlexMessage = LineMessageBuilder.createDeplayReplyMessage();

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
      logger.error(new LoggerError(user.name + 'がLineIDが設定されていない。'));

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
