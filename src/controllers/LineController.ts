import { Repository } from "typeorm";
import { Controller } from "tsoa";
import Container from "typedi";
import { FlexMessage, MessageAPIResponseBase, TextMessage, WebhookEvent } from "@line/bot-sdk";

import ChatMessage from "@/entities/transactions/ChatMessage";
import ChatTool from "@/entities/masters/ChatTool";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";

import LineRepository from "@/repositories/LineRepository";
import LineMessageQueueRepository from "@/repositories/modules/LineMessageQueueRepository";

import LineMessageBuilder from "@/common/LineMessageBuilder";
import {
  ChatToolCode,
  LineMessageQueueStatus,
  MessageTriggerType,
  MessageType,
  ReplyStatus,
  TodoStatus,
} from "@/consts/common";
import logger from "@/logger/winston";
import { LoggerError } from "@/exceptions";
import { diffDays, toJapanDateTime } from "@/utils/common";
import AppDataSource from "@/config/data-source";
import TaskService from "@/services/TaskService";
import { messageData, REMIND_ME_COMMAND, replyMessages } from "@/consts/line";

import { SectionRepository } from "@/repositories/settings/SectionRepository";
import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import { ChatToolRepository } from "@/repositories/master/ChatToolRepository";
import { ChatMessageRepository } from "@/repositories/transactions/ChatMessageRepository";

export default class LineController extends Controller {
  private readonly lineRepository: LineRepository;
  private readonly lineQueueRepository: LineMessageQueueRepository;
  private readonly taskService: TaskService;

  constructor() {
    super();
    this.lineRepository = Container.get(LineRepository);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
    this.taskService = Container.get(TaskService);
  }

  public async handleEvents(events: Array<WebhookEvent>) {
    await Promise.all(events.map(event => this.handleEvent(event)));
    return { message: "line webhook" };
  }

  private async handleEvent(event: WebhookEvent): Promise<any> {
    try {
      const chattool = await ChatToolRepository.findOneBy({
        tool_code: ChatToolCode.LINE,
      });
      if (!chattool) {
        logger.error(new LoggerError("LINE is not implemented yet!"));
        return;
      }

      const lineId = event.source.userId;
      const user = await this.lineRepository.getUserFromLineId(lineId);

      switch (event.type) {
        // case "join":
        //   if (event.source.type === "group") {
        //     const groupId = event.source.groupId;
        //   }
        //   return;
        //
        // case "leave":
        //   if (event.source.type === "group") {
        //     const groupId = event.source.groupId;
        //   }
        //   return;

        case "memberJoined":
          if (event.source.type === "group") {
            const groupId = event.source.groupId;
            const newMember: string[] = event.joined.members.map(member => member.userId);
          }
          return;

        case "memberLeft":
          if (event.source.type === "group") {
            const groupId = event.source.groupId;
            const leftMember: string[] = event.left.members.map(member => member.userId);
          }
          return;

        case "follow":
          // const lineProfile = await LineBot.getProfile(lineId);
          // await this.lineRepository.createLineProfile(lineProfile);
          return;

        case "unfollow":
          return;

        case "postback":
          if (event.postback.data === REMIND_ME_COMMAND) {
            // get user from lineId
            if (user) {
              await this.replyProcessingJob(chattool, user, event.replyToken);
              await this.taskService.remindForDemoUser(user);
            } else {
              console.error("Line ID :" + lineId + "のアカウントが登録されていません。");
            }
          } else if (messageData.includes(event.postback.data)) {
            const messageContent = replyMessages.find(message => message.status === event.postback.data)?.displayText;
            await this.handleReplyMessage(chattool, user, lineId, messageContent, event.replyToken);
          }
          return;

        case "message":
          const unknownMessage = LineMessageBuilder.createBotMessageOnUndefined();
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
    replyToken: string,
  ) {
    if (!user) {
      return;
    }

    const lineMessageQueue = await this.lineQueueRepository.fetchLineMessageQueue(user.id);
    if (!lineMessageQueue) {
      return;
    }

    // update status
    lineMessageQueue.status = LineMessageQueueStatus.REPLIED;
    const sections = lineMessageQueue.todo.sections;
    const sectionId = sections.length ? sections[0].id : null;
    const todoAppId = lineMessageQueue.todo.todoapp_id;
    const boardAdminUser = await SectionRepository.getBoardAdminUser(sectionId);
    const todoAppAdminUser = boardAdminUser.todoAppUsers.find(tau => tau.todoapp_id === todoAppId);
    const doneMessages = replyMessages.filter(m => m.status === TodoStatus.DONE).map(m => m.displayText);
    if (doneMessages.includes(repliedMessage)) {
      lineMessageQueue.todo.is_done = true;
      const todo = lineMessageQueue.todo;
      const correctDelayedCount = todo.deadline < lineMessageQueue.remind_date;
      await this.taskService.update(todo.todoapp_reg_id, todo, todoAppAdminUser, correctDelayedCount);
    }
    await this.lineQueueRepository.saveQueue(lineMessageQueue);
    await this.updateRepliedFlag(lineMessageQueue.message_id);

    await this.reportSuperiorUsersOnReplied(
      chattool,
      replyToken,
      lineId,
      user,
      repliedMessage,
      lineMessageQueue.todo,
      lineMessageQueue.message.remind_before_days,
      lineMessageQueue.message_id,
    );

    const nextQueue = await this.lineQueueRepository.getFirstQueueTaskForSendLine(user.id);

    if (nextQueue && nextQueue.todo) {
      const todo = nextQueue.todo;
      const dayDurations = diffDays(toJapanDateTime(nextQueue.todo.deadline), toJapanDateTime(new Date()));

      const chatMessage = await this.lineRepository.pushMessageRemind(chattool, user, todo, dayDurations);

      // change status
      nextQueue.status = LineMessageQueueStatus.UNREPLIED;
      nextQueue.message_id = chatMessage?.id;
      await this.lineQueueRepository.saveQueue(nextQueue);

      // reminded_count をカウントアップするのを「期日後のリマインドを送ったとき」のみに限定していただくことは可能でしょうか？
      // 他の箇所（期日前のリマインドを送ったときなど）で reminded_count をカウントアップする処理は、コメントアウトする形で残しておいていただけますと幸いです。
      if (dayDurations > 0) {
        todo.reminded_count += 1;
      }

      await TodoRepository.save(todo);
    }
  }

  private async reportSuperiorUsersOnReplied(
    chattool: ChatTool,
    replyToken: string,
    lineId: string,
    user: User,
    replyMessage: string,
    todo: Todo,
    remindDays,
    messageParentId: number,
  ) {
    const superiorUsers = await this.lineRepository.getSuperiorUsers(lineId);

    if (superiorUsers.length === 0) {
      await this.handleByReplyMessage(replyMessage, chattool, user, replyToken);
    } else {
      await Promise.all(superiorUsers.map(async (superiorUser) => {
        await this.handleByReplyMessage(replyMessage, chattool, user, replyToken, superiorUser.name);
        const chatMessage = new ChatMessage(
          chattool,
          replyMessage,
          MessageTriggerType.REPLY,
          MessageType.FLEX,
          user,
          null,
          null,
          null,
          todo,
          replyToken,
          messageParentId,
        );
        await ChatMessageRepository.save(chatMessage);
        await this.sendSuperiorMessage(
          chattool,
          superiorUser,
          user.name,
          todo,
          remindDays,
          replyMessage,
        );
      }));
    }
  }

  private async handleByReplyMessage(
    replyMessage: string,
    chattool: ChatTool,
    user: User,
    replyToken: string,
    superior?: string,
  ) {
    const messageMatchesStatus = (message: string, statuses: TodoStatus[]): boolean => {
      const targetMessages = replyMessages.filter(m => statuses.includes(m.status)).map(m => m.displayText);
      return targetMessages.includes(message);
    };

    if (messageMatchesStatus(replyMessage, [TodoStatus.DONE])) {
      await this.replyDoneAction(chattool, user, replyToken, superior);
    } else if (messageMatchesStatus(replyMessage, [TodoStatus.ONGOING, TodoStatus.NOT_YET])) {
      await this.replyInProgressAction(chattool, user, replyToken, superior);
    } else if (messageMatchesStatus(replyMessage, [TodoStatus.DELAYED])) {
      await this.replyDelayAction(chattool, user, replyToken);
    } else if (messageMatchesStatus(replyMessage, [TodoStatus.WITHDRAWN])) {
      await this.replyWithdrawnAction(chattool, user, replyToken);
    }
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
    superior?: string,
  ): Promise<MessageAPIResponseBase> {
    const message: TextMessage = LineMessageBuilder.createResponseToReplyDone(superior);
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
    superior?: string,
  ): Promise<MessageAPIResponseBase> {
    const message: TextMessage = LineMessageBuilder.createResponseToReplyInProgress(superior);
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
    replyToken: string,
  ): Promise<MessageAPIResponseBase> {
    const message: TextMessage = LineMessageBuilder.createResponseToReplyDelayed();
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
    replyToken: string,
  ): Promise<MessageAPIResponseBase> {
    const message: TextMessage = LineMessageBuilder.createResponseToReplyWithdrawn();
    return await this.lineRepository.replyMessage(chattool, replyToken, message, user);
  }

  private async replyProcessingJob(
    chattool: ChatTool,
    user: User,
    replyToken: string,
  ): Promise<MessageAPIResponseBase> {
    const replyMessage: TextMessage = LineMessageBuilder.createBotMessageOnProcessingJob();
    return await this.lineRepository.replyMessage(chattool, replyToken, replyMessage, user);
  }

  private async updateRepliedFlag(messageId: number) {
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
    superiorUser: User,
    userName: string,
    todo: Todo,
    remindDays: number,
    reportContent: string,
  ): Promise<MessageAPIResponseBase> {
    if (!superiorUser.lineId) {
      logger.error(new LoggerError(superiorUser.name + "さんのLINE IDが設定されていません。"));
      return;
    }

    await this.lineRepository.pushStartReportToSuperior(chattool, superiorUser);

    const reportMessage: FlexMessage = LineMessageBuilder.createReportMessage(
      userName,
      todo.name,
      todo.todoapp_reg_url,
      todo.deadline,
      remindDays,
      reportContent,
    );
    return await this.lineRepository.pushLineMessage(
      chattool,
      reportMessage,
      MessageTriggerType.REPORT,
      superiorUser,
    );
  }
}