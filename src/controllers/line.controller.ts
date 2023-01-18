import { Controller, Route } from "tsoa";
import { FlexMessage, MessageAPIResponseBase, TextMessage, WebhookEvent } from "@line/bot-sdk";

import { User } from "../entify/user.entity";
import { LineMessageBuilder } from "../common/lineMessages";
import { LineBot } from "../config/linebot";
import LineRepository from "../repositories/line.repository";
import Container from "typedi";
import {
  ChatToolCode,
  LineMessageQueueStatus,
  messageData,
  MessageTriggerType,
  MessageType,
  OpenStatus,
  REMIND_ME_COMMAND,
  replyMessages,
  ReplyStatus,
  SenderType,
  TodoStatus
} from "../const/common";
import { ChatMessage } from "../entify/message.entity";
import moment from "moment";
import logger from "../logger/winston";
import { LoggerError } from "../exceptions";
import { diffDays, toJapanDateTime } from "../utils/common";
import { ChatTool } from "../entify/chatTool.entity";
import { Repository } from "typeorm";
import { AppDataSource } from "../config/dataSource";
import CommonRepository from "../repositories/modules/common.repository";
import { ITodo, IUser } from "../types";
import LineQueueRepository from "../repositories/modules/lineQueue.repository";
import { Todo } from "../entify/todo.entity";
import TaskService from "../services/task.service";

@Route("line")
export default class LineController extends Controller {
  private lineRepository: LineRepository;
  private chattoolRepository: Repository<ChatTool>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;
  private lineQueueRepository: LineQueueRepository;
  private taskService: TaskService;

  constructor() {
    super();
    this.lineRepository = Container.get(LineRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.chattoolRepository = AppDataSource.getRepository(ChatTool);
    this.lineQueueRepository = Container.get(LineQueueRepository);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.taskService = Container.get(TaskService);
  }

  public async handlerEvents(events: Array<WebhookEvent>): Promise<any> {
    events.map(async (event) => await this.handleEvent(event));

    return {
      message: "line webhook",
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
        logger.error(new LoggerError("LINE is not implemented yet!"));
        return;
      }

      const lineId = event.source.userId;
      const user = await this.lineRepository.getUserFromLineId(lineId);

      switch (event.type) {
        case "follow":
          // LINE Official Account is added as a friend
          // eslint-disable-next-line no-case-declarations
          const lineProfile = await LineBot.getProfile(lineId);
          await this.lineRepository.createLineProfile(lineProfile);
          return;

        case "postback":
          if (event.postback.data === REMIND_ME_COMMAND) {
            // get user from lineId
            if (user) {
              await this.replyProcessingJob(chattool, user, event.replyToken);
              await this.taskService.remindTaskForDemoUser(user);
            } else {
              console.error("Line ID :" + lineId + "のアカウントが登録されていません。");
            }
          } else if (messageData.includes(event.postback.data)) {
            const messageContent = replyMessages.find(message => message.status === event.postback.data)?.displayText;
            await this.handleReplyMessage(chattool, user, lineId, messageContent, event.replyToken);
          }
          return;

        case "message":
          const unknownMessage = LineMessageBuilder.createUnKnownMessage();
          await this.lineRepository.replyMessage(chattool, event.replyToken, unknownMessage, user);
          return;

        default:
          return;
      }
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

    // get waiting queue message
    const waitingReplyQueue = await this.lineQueueRepository.getWaitingQueueTask(user.id);
    if (!waitingReplyQueue) {
      return;
    }

    // update status
    waitingReplyQueue.status = LineMessageQueueStatus.REPLIED;
    waitingReplyQueue.updated_at = toJapanDateTime(new Date());
    const sectionId = waitingReplyQueue.todo.sections.length ? waitingReplyQueue.todo.sections[0].id : null;
    const todoAppId = waitingReplyQueue.todo.todoapp_id;
    const boardAdminUser = await this.commonRepository.getBoardAdminUser(sectionId);
    const todoAppAdminUser = boardAdminUser.todoAppUsers.find(tau => tau.todoapp_id === todoAppId);
    const doneMessages = replyMessages.filter(m => m.status === TodoStatus.DONE).map(m => m.displayText);
    if (doneMessages.includes(repliedMessage)) {
      waitingReplyQueue.todo.is_done = true;
      const todo = waitingReplyQueue.todo;
      const correctDelayedCount = todo.deadline < waitingReplyQueue.remind_date;
      await this.taskService.updateTask(todo.todoapp_reg_id, todo, todoAppAdminUser, correctDelayedCount);
    }
    await this.lineQueueRepository.saveQueue(waitingReplyQueue);
    await this.updateIsReplyFlag(waitingReplyQueue.message_id);

    await this.remindToSuperiorUsers(
      chattool,
      replyToken,
      lineId,
      user,
      repliedMessage,
      waitingReplyQueue.todo,
      waitingReplyQueue.message.remind_before_days,
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
    remindDays,
    messageParentId: number
  ) {
    const superiorUsers = await this.lineRepository.getSuperiorUsers(lineId);

    if (superiorUsers.length == 0) {
      await this.handleByReplyMessage(replyMessage, chattool, user, replyToken);
    } else {
      await Promise.all(superiorUsers.map(async (superiorUser) => {
        await this.handleByReplyMessage(replyMessage, chattool, user, replyToken, superiorUser.name);
        await this.saveChatMessage(
          chattool,
          todo,
          user.id,
          messageParentId,
          replyMessage,
          replyToken,
          MessageTriggerType.REPLY
        );
        await this.sendSuperiorMessage(
          chattool,
          superiorUser,
          user.name,
          todo,
          remindDays,
          replyMessage
        );
      }));
    }
  }

  private async handleByReplyMessage(
    replyMessage: string,
    chattool: ChatTool,
    user: User,
    replyToken: string,
    superior?: string
  ) {
    const messageMatchesStatus = (message: string, status: TodoStatus): boolean => {
      const targetMessages = replyMessages.filter(m => m.status === status).map(m => m.displayText);
      return targetMessages.includes(message);
    };

    if (messageMatchesStatus(replyMessage, TodoStatus.DONE)) {
      await this.replyDoneAction(chattool, user, replyToken, superior);
    } else if (messageMatchesStatus(replyMessage, TodoStatus.ONGOING) || messageMatchesStatus(replyMessage, TodoStatus.NOT_YET)) {
      await this.replyInProgressAction(chattool, user, replyToken, superior);
    } else if (messageMatchesStatus(replyMessage, TodoStatus.DELAYED)) {
      await this.replyDelayAction(chattool, user, replyToken);
    } else if (messageMatchesStatus(replyMessage, TodoStatus.WITHDRAWN)) {
      await this.replyWithdrawnAction(chattool, user, replyToken);
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
    chatMessage.send_at = toJapanDateTime(moment().utc().toDate());
    chatMessage.message_token = messageToken;
    chatMessage.user_id = userId;
    chatMessage.parent_message_id = messageParentId;

    return await this.lineRepository.createMessage(chatMessage);
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
    const message: TextMessage = LineMessageBuilder.createReplyDoneMessage(superior);
    return await this.lineRepository.replyMessage(chattool, replyToken, message, user);
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
    const message: TextMessage = LineMessageBuilder.createReplyInProgressMessage(superior);
    return await this.lineRepository.replyMessage(chattool, replyToken, message, user);
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
    const message: TextMessage = LineMessageBuilder.createDelayReplyMessage();
    return await this.lineRepository.replyMessage(chattool, replyToken, message, user);
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
    const message: TextMessage = LineMessageBuilder.createWithdrawnReplyMessage();
    return await this.lineRepository.replyMessage(chattool, replyToken, message, user);
  }

  private async replyProcessingJob(
    chattool: ChatTool,
    user: User,
    replyToken: string
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: TextMessage = LineMessageBuilder.createProcessingJobReplyMessage();
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
   * @param todo
   * @param remindDays
   * @param reportContent
   * @returns
   */
  private async sendSuperiorMessage(
    chattool: ChatTool,
    superiorUser: IUser,
    userName: string,
    todo: ITodo,
    remindDays: number,
    reportContent: string
  ): Promise<MessageAPIResponseBase> {
    const chatToolUser = await this.commonRepository.getChatToolUser(superiorUser.id, chattool.id);
    const user = { ...superiorUser, line_id: chatToolUser?.auth_key };

    if (!chatToolUser?.auth_key) {
      logger.error(new LoggerError(user.name + "さんのLINE IDが設定されていません。"));
      return;
    }

    await this.lineRepository.pushStartReportToSuperior(chattool, user);

    const reportMessage: FlexMessage = LineMessageBuilder.createReportToSuperiorMessage(
      userName,
      todo.name,
      todo.todoapp_reg_url,
      todo.deadline,
      remindDays,
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
