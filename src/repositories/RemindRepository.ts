import { Repository } from "typeorm";
import { Service, Container } from "typedi";

import ChatTool from "@/entities/masters/ChatTool";
import LineMessageQueue from "@/entities/transactions/LineMessageQueue";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";
import ChatToolUser from "@/entities/settings/ChatToolUser";
import Company from "@/entities/settings/Company";

import LineRepository from "./LineRepository";
import LineMessageQueueRepository from "./modules/LineMessageQueueRepository";

import { diffDays, toJapanDateTime } from "@/utils/common";
import logger from "@/logger/winston";
import { ChatToolCode, LineMessageQueueStatus, MAX_REMIND_COUNT } from "@/consts/common";
import AppDataSource from "@/config/data-source";
import { LoggerError } from "@/exceptions";
import { ITodoLines } from "@/types";
import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import { ChatToolUserRepository } from "@/repositories/settings/ChatToolUserRepository";
import { ChatToolRepository } from "@/repositories/master/ChatToolRepository";

@Service()
export default class RemindRepository {
  private lineRepository: LineRepository;
  private lineQueueRepository: LineMessageQueueRepository;

  constructor() {
    this.lineRepository = Container.get(LineRepository);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
  }

  public async remindTodayTaskForUser(user: User = null): Promise<void> {
    const remindTasks: Todo[] = [];
    const todoQueueTasks: LineMessageQueue[] = [];

    const todoAllTodayQueueTasks = await this.lineQueueRepository.getTodayQueueTasks(user);

    const chattoolUsers = await ChatToolUserRepository.find();
    const chattool = await ChatToolRepository.findOneBy({
      tool_code: ChatToolCode.LINE,
    });

    const userTodoQueueMap = this.mapUserQueueTaskList(
      todoAllTodayQueueTasks,
      chattool,
      chattoolUsers,
    );

    for await (const [_, todoLines] of userTodoQueueMap) {
      await this.lineRepository.pushMessageStartRemindToUser(todoLines);

      //push first line
      const todoLine = todoLines[0];
      const chatMessage = await this.lineRepository.pushTodoLine(todoLine);
      todoQueueTasks.push({ ...todoLine.todoQueueTask, message_id: chatMessage?.id });
      remindTasks.push(todoLine.todo);
    }

    await this.updateStatusLineMessageQueue(todoQueueTasks);
    await this.updateRemindedCount(remindTasks);
  }

  private mapUserQueueTaskList(
    todoAllTodayQueueTasks: LineMessageQueue[],
    chatTool: ChatTool,
    chatToolUsers: ChatToolUser[],
  ): Map<number, ITodoLines[]> {
    const map = new Map<number, ITodoLines[]>();

    for (const lineQueues of todoAllTodayQueueTasks) {
      const remindDays = diffDays(toJapanDateTime(lineQueues.todo.deadline), toJapanDateTime(new Date()));
      const chatToolUser = chatToolUsers.find(chatToolUser =>
        chatTool && chatToolUser.chattool_id === chatTool.id && chatToolUser.user_id === lineQueues.user.id,
      );

      if (chatToolUser) {
        if (map.has(lineQueues.user_id)) {
          map.get(lineQueues.user_id).push({
            todo: lineQueues.todo,
            user: lineQueues.user,
            chattool: chatTool,
            remindDays: remindDays,
            todoQueueTask: lineQueues,
          });
        } else {
          map.set(lineQueues.user_id, [
            {
              todo: lineQueues.todo,
              user: lineQueues.user,
              chattool: chatTool,
              remindDays: remindDays,
              todoQueueTask: lineQueues,
            },
          ]);
        }
      }
    }

    return map;
  }

  /**
   * remind task for admin company
   *
   * @param company
   */
  public async remindTaskForAdminCompany(company: Company): Promise<void> {
    if (!company.adminUser) {
      logger.error(new LoggerError(company.name + "の管理者が設定していません。"));
    }

    const chatToolUsers = await ChatToolUserRepository.find();
    const needRemindTasks = await TodoRepository.getNoDeadlineOrUnassignedTodos(company.id);

    // 期日未設定のタスクがない旨のメッセージが管理者に送られること
    if (needRemindTasks.length) {
      // 期日未設定のタスクがある場合

      const notSetDueDateAndNotAssign = needRemindTasks.filter(todo => !todo.deadline && !todo.todoUsers.length);

      if (notSetDueDateAndNotAssign.length) {
        const remindTasks = notSetDueDateAndNotAssign.filter(todo => todo.reminded_count < MAX_REMIND_COUNT);

        // 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
        // Send to admin list task which not set duedate
        if (remindTasks.length) {
          for (const chatTool of company.chatTools) {
            if (chatTool.tool_code === ChatToolCode.LINE && company.adminUser) {
              const adminUser = company.adminUser;
              const chatToolUser = chatToolUsers.find(
                chatToolUser => chatToolUser.chattool_id === chatTool.id && chatToolUser.user_id === adminUser.id,
              );

              if (chatToolUser) {
                await this.lineRepository.pushListTaskMessageToAdmin(chatTool, adminUser, remindTasks);
              }
            }
          }

          // await this.updateRemindedCount(remindTasks);
        }
      } else {
        for (const chatTool of company.chatTools) {
          if (chatTool.tool_code === ChatToolCode.LINE && company.adminUser) {
            const adminUser = company.adminUser;
            const chatToolUser = chatToolUsers.find(
              chattoolUser => chattoolUser.chattool_id === chatTool.id && chattoolUser.user_id === adminUser.id,
            );

            if (chatToolUser) {
              await this.lineRepository.pushNoListTaskMessageToAdmin(chatTool, adminUser);
            }
          }
        }
      }

      // ・期日未設定のタスク一覧が1つのメッセージで担当者に送られること
      const notSetDueDateTasks = needRemindTasks.filter(
        todo => todo.deadline && todo.users.length && todo.reminded_count < MAX_REMIND_COUNT,
      );

      // Send list task to each user
      if (notSetDueDateTasks.length) {
        const userTodoMap = this.mapUserTaskList(notSetDueDateTasks);

        for (const [user_id, todos] of userTodoMap) {
          for (const chatTool of company.chatTools) {
            if (chatTool.tool_code === ChatToolCode.LINE) {
              const user = todos[0].users.find(user => user.id === user_id);
              const chatToolUser = chatToolUsers.find(chattoolUser => {
                return chattoolUser.chattool_id === chatTool.id && chattoolUser.user_id === user_id;
              });

              if (chatToolUser) {
                await this.lineRepository.pushListTaskMessageToUser(chatTool, user, todos);
              }
            }
          }

          // await this.updateRemindedCount(todos);
        }
      }

      // 担当者未設定・期日設定済みの場合
      const notSetAssignTasks = needRemindTasks.filter(
        (task) =>
          task.deadline && !task.users.length && task.reminded_count < MAX_REMIND_COUNT,
      );

      if (notSetAssignTasks.length) {
        for (const chatTool of company.chatTools) {
          if (chatTool.tool_code === ChatToolCode.LINE && company.adminUser) {
            const adminUser = company.adminUser;
            const chatToolUser = chatToolUsers.find(
              (chattoolUser) =>
                chattoolUser.chattool_id === chatTool.id && chattoolUser.user_id === adminUser.id,
            );

            if (chatToolUser) {
              await this.lineRepository.pushNotAssignListTaskMessageToAdmin(
                chatTool,
                adminUser,
                notSetAssignTasks,
              );
            }
          }
        }

        // await this.updateRemindedCount(notSetAssignTasks);
      }
    }
  }

  private mapUserTaskList(todos: Todo[]): Map<number, Todo[]> {
    const map = new Map<number, Todo[]>();

    todos.forEach((todo) => {
      for (const todoUser of todo.todoUsers) {
        if (map.has(todoUser.user.id)) {
          map.get(todoUser.user.id).push(todo);
        } else {
          map.set(todoUser.user.id, [todo]);
        }
      }
    });

    return map;
  }

  private async updateStatusLineMessageQueue(todoQueueTasks: LineMessageQueue[]): Promise<any> {
    const lineQueueDatas = todoQueueTasks.map((lineQueue) => {
      return {
        ...lineQueue,
        status: LineMessageQueueStatus.UNREPLIED,
        updated_at: toJapanDateTime(new Date()),
      };
    });

    if (lineQueueDatas.length) {
      return await this.lineQueueRepository.insertOrUpdate(lineQueueDatas);
    }
  }

  private async updateRemindedCount(todos: Todo[]): Promise<any> {
    const todoData = todos.map((todo) => {
      const dayDurations = diffDays(toJapanDateTime(todo.deadline), toJapanDateTime(new Date()));

      if (dayDurations > 0) {
        todo.reminded_count = todo.reminded_count + 1;
      }

      return todo;
    });

    if (todoData.length) {
      return await TodoRepository.upsert(todoData, []);
    }
  }
}
