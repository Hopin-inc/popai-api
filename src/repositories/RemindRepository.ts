import { Repository } from "typeorm";
import { Service, Container } from "typedi";

import ChatTool from "@/entities/ChatTool";
import LineMessageQueue from "@/entities/LineMessageQueue";
import Todo from "@/entities/Todo";
import User from "@/entities/User";

import LineRepository from "./LineRepository";
import CommonRepository from "./modules/CommonRepository";
import LineMessageQueueRepository from "./modules/LineMessageQueueRepository";

import { diffDays, toJapanDateTime } from "@/utils/common";
import logger from "@/logger/winston";
import { ChatToolCode, LineMessageQueueStatus, MAX_REMIND_COUNT } from "@/consts/common";
import AppDataSource from "@/config/data-source";
import { LoggerError } from "@/exceptions";
import { IChatTool, IChatToolUser, ICompany, ITodo, ITodoLines } from "@/types";

@Service()
export default class RemindRepository {
  private lineRepo: LineRepository;
  private commonRepository: CommonRepository;
  private todoRepository: Repository<Todo>;
  private lineQueueRepository: LineMessageQueueRepository;
  private chattoolRepository: Repository<ChatTool>;

  constructor() {
    this.lineRepo = Container.get(LineRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
    this.chattoolRepository = AppDataSource.getRepository(ChatTool);
  }

  remindTodayTaskForUser = async (user: User = null): Promise<void> => {
    const remindTasks: ITodo[] = [];
    const todoQueueTasks: LineMessageQueue[] = [];

    const todoAllTodayQueueTasks = await this.lineQueueRepository.getTodayQueueTasks(user);

    const chattoolUsers = await this.commonRepository.getChatToolUsers();
    const chattool = await this.chattoolRepository.findOneBy({
      tool_code: ChatToolCode.LINE,
    });

    const userTodoQueueMap = this.mapUserQueueTaskList(
      todoAllTodayQueueTasks,
      chattool,
      chattoolUsers,
    );

    for await (const [_, todoLines] of userTodoQueueMap) {
      await this.lineRepo.pushMessageStartRemindToUser(todoLines);

      //push first line
      const todoLine = todoLines[0];
      const chatMessage = await this.lineRepo.pushTodoLine(todoLine);
      todoQueueTasks.push({ ...todoLine.todoQueueTask, message_id: chatMessage?.id });
      remindTasks.push(todoLine.todo);
    }

    await this.updateStatusLineMessageQueue(todoQueueTasks);
    await this.updateRemindedCount(remindTasks);
  };

  mapUserQueueTaskList = (
    todoAllTodayQueueTasks: LineMessageQueue[],
    chattool: IChatTool,
    chattoolUsers: IChatToolUser[]
  ): Map<number, ITodoLines[]> => {
    const map = new Map<number, ITodoLines[]>();

    for (const lineQueues of todoAllTodayQueueTasks) {
      const remindDays = diffDays(lineQueues.todo.deadline, toJapanDateTime(new Date()));
      const chatToolUser = chattoolUsers.find(chattoolUser =>
        chattool && chattoolUser.chattool_id === chattool.id && chattoolUser.user_id === lineQueues.user.id
      );

      if (chatToolUser) {
        if (map.has(lineQueues.user_id)) {
          map.get(lineQueues.user_id).push({
            todo: lineQueues.todo,
            user: { ...lineQueues.user, line_id: chatToolUser.auth_key },
            chattool: chattool,
            remindDays: remindDays,
            todoQueueTask: lineQueues,
          });
        } else {
          map.set(lineQueues.user_id, [
            {
              todo: lineQueues.todo,
              user: { ...lineQueues.user, line_id: chatToolUser.auth_key },
              chattool: chattool,
              remindDays: remindDays,
              todoQueueTask: lineQueues,
            },
          ]);
        }
      }
    }

    return map;
  };

  /**
   * remind task for admin company
   *
   * @param company
   */
  remindTaskForAdminCompany = async (company: ICompany): Promise<void> => {
    if (!company.adminUser) {
      logger.error(new LoggerError(company.name + "の管理者が設定していません。"));
    }

    const chattoolUsers = await this.commonRepository.getChatToolUsers();
    const needRemindTasks = await this.commonRepository.getNotsetDueDateOrNotAssignTasks(company.id);

    // 期日未設定のタスクがない旨のメッセージが管理者に送られること
    if (needRemindTasks.length) {
      // 期日未設定のタスクがある場合

      const notSetDueDateAndNotAssign = needRemindTasks.filter(todo => !todo.deadline && !todo.todoUsers.length);

      if (notSetDueDateAndNotAssign.length) {
        const remindTasks = notSetDueDateAndNotAssign.filter(todo => todo.reminded_count < MAX_REMIND_COUNT);

        // 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
        // Send to admin list task which not set duedate
        if (remindTasks.length) {
          for (const chattool of company.chattools) {
            if (chattool.tool_code === ChatToolCode.LINE && company.adminUser) {
              const adminUser = company.adminUser;
              const chatToolUser = chattoolUsers.find(
                chattoolUser => chattoolUser.chattool_id === chattool.id && chattoolUser.user_id === adminUser.id
              );

              if (chatToolUser) {
                await this.lineRepo.pushListTaskMessageToAdmin(
                  chattool,
                  { ...adminUser, line_id: chatToolUser.auth_key },
                  remindTasks,
                );
              }
            }
          }

          // await this.updateRemindedCount(remindTasks);
        }
      } else {
        for (const chattool of company.chattools) {
          if (chattool.tool_code === ChatToolCode.LINE && company.adminUser) {
            const adminUser = company.adminUser;
            const chatToolUser = chattoolUsers.find(
              chattoolUser => chattoolUser.chattool_id === chattool.id && chattoolUser.user_id === adminUser.id
            );

            if (chatToolUser) {
              await this.lineRepo.pushNoListTaskMessageToAdmin(chattool, {
                ...adminUser,
                line_id: chatToolUser.auth_key,
              });
            }
          }
        }
      }

      // ・期日未設定のタスク一覧が1つのメッセージで担当者に送られること
      const notSetDueDateTasks = needRemindTasks.filter(
        todo => todo.deadline && todo.users.length && todo.reminded_count < MAX_REMIND_COUNT
      );

      // Send list task to each user
      if (notSetDueDateTasks.length) {
        const userTodoMap = this.mapUserTaskList(notSetDueDateTasks);

        for (const [_, todos] of userTodoMap) {
          for (const chattool of company.chattools) {
            if (chattool.tool_code === ChatToolCode.LINE) {
              const user = todos[0].user;
              const chatToolUser = chattoolUsers.find(chattoolUser => {
                return chattoolUser.chattool_id === chattool.id && chattoolUser.user_id === user.id;
              });

              if (chatToolUser) {
                await this.lineRepo.pushListTaskMessageToUser(
                  chattool,
                  { ...user, line_id: chatToolUser.auth_key },
                  todos,
                );
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
        for (const chattool of company.chattools) {
          if (chattool.tool_code === ChatToolCode.LINE && company.adminUser) {
            const adminUser = company.adminUser;
            const chatToolUser = chattoolUsers.find(
              (chattoolUser) =>
                chattoolUser.chattool_id === chattool.id && chattoolUser.user_id === adminUser.id,
            );

            if (chatToolUser) {
              await this.lineRepo.pushNotAssignListTaskMessageToAdmin(
                chattool,
                { ...adminUser, line_id: chatToolUser.auth_key },
                notSetAssignTasks,
              );
            }
          }
        }

        // await this.updateRemindedCount(notSetAssignTasks);
      }
    }
  };

  mapUserTaskList = (todos: ITodo[]): Map<number, ITodo[]> => {
    const map = new Map<number, ITodo[]>();

    todos.forEach((todo) => {
      for (const todoUser of todo.todoUsers) {
        if (map.has(todoUser.user.id)) {
          map.get(todoUser.user.id).push({ ...todo, user: todoUser.user });
        } else {
          map.set(todoUser.user.id, [{ ...todo, user: todoUser.user }]);
        }
      }
    });

    return map;
  };

  updateStatusLineMessageQueue = async (todoQueueTasks: LineMessageQueue[]): Promise<any> => {
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
  };

  updateRemindedCount = async (todos: ITodo[]): Promise<any> => {
    const todoDatas = todos.map((todo) => {
      const dayDurations = diffDays(todo.deadline, toJapanDateTime(new Date()));

      // reminded_count をカウントアップするのを「期日後のリマインドを送ったとき」のみに限定していただくことは可能でしょうか？
      // 他の箇所（期日前のリマインドを送ったときなど）で reminded_count をカウントアップする処理は、コメントアウトする形で残しておいていただけますと幸いです。
      if (dayDurations > 0) {
        todo.reminded_count = todo.reminded_count + 1;
      }

      return todo;
    });

    if (todoDatas.length) {
      return await this.todoRepository.upsert(todoDatas, []);
    }
  };
}
