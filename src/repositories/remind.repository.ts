import { AppDataSource } from '../config/data-source';
import { LoggerError } from '../exceptions';
import { Repository } from 'typeorm';
import { IChatTool, IChatToolUser, ICompany, ITodo, ITodoLines } from '../types';
import { ChatToolCode, Common, LineMessageQueueStatus } from '../const/common';
import { Service, Container } from 'typedi';
import logger from '../logger/winston';
import { Todo } from '../entify/todo.entity';
import LineRepository from './line.repository';
import CommonRepository from './modules/common.repository';
import { diffDays, toJapanDateTime } from './../utils/common';
import LineQuequeRepository from './modules/line_queque.repository';
import { ChatTool } from './../entify/chat_tool.entity';
import { LineMessageQueue } from './../entify/line_message_queue.entity';

@Service()
export default class RemindRepository {
  private lineRepo: LineRepository;
  private commonRepository: CommonRepository;
  private todoRepository: Repository<Todo>;
  private lineQueueRepository: LineQuequeRepository;
  private chattoolRepository: Repository<ChatTool>;

  constructor() {
    this.lineRepo = Container.get(LineRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.lineQueueRepository = Container.get(LineQuequeRepository);
    this.chattoolRepository = AppDataSource.getRepository(ChatTool);
  }

  remindTodayTaskForUser = async (): Promise<void> => {
    const remindTasks: ITodo[] = [];
    const todoQueueTasks: LineMessageQueue[] = [];

    const todoAllTodayQueueTasks = await this.lineQueueRepository.getTodayQueueTasks();

    const chattoolUsers = await this.commonRepository.getChatToolUsers();
    const chattool = await this.chattoolRepository.findOneBy({
      tool_code: ChatToolCode.LINE,
    });

    const userTodoQueueMap = this.mapUserQueueTaskList(
      todoAllTodayQueueTasks,
      chattool,
      chattoolUsers
    );

    for await (const [userId, todoLines] of userTodoQueueMap) {
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
      const chatToolUser = chattoolUsers.find(
        (chattoolUser) =>
          chattool &&
          chattoolUser.chattool_id == chattool.id &&
          chattoolUser.user_id == lineQueues.user.id
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
    if (!company.admin_user) {
      logger.error(new LoggerError(company.name + 'の管理者が設定していません。'));
    }

    const chattoolUsers = await this.commonRepository.getChatToolUsers();
    const needRemindTasks = await this.commonRepository.getNotsetDueDateOrNotAssignTasks(
      company.id
    );

    // 期日未設定のタスクがない旨のメッセージが管理者に送られること
    if (needRemindTasks.length) {
      // 期日未設定のタスクがある場合

      const notSetDueDateAndNotAssign = needRemindTasks.filter(
        (task) => !task.deadline && !task.todoUsers.length
      );

      if (notSetDueDateAndNotAssign.length) {
        const remindTasks = notSetDueDateAndNotAssign.filter(
          (tasks) => tasks.reminded_count < Common.remindMaxCount
        );

        // 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
        // Send to admin list task which not set duedate
        if (remindTasks.length) {
          company.chattools.forEach(async (chattool) => {
            if (chattool.tool_code == ChatToolCode.LINE && company.admin_user) {
              const adminUser = company.admin_user;
              const chatToolUser = chattoolUsers.find(
                (chattoolUser) =>
                  chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == adminUser.id
              );

              if (chatToolUser) {
                await this.lineRepo.pushListTaskMessageToAdmin(
                  chattool,
                  { ...adminUser, line_id: chatToolUser.auth_key },
                  remindTasks
                );
              }
            }
          });

          await this.updateRemindedCount(remindTasks);
        }
      } else {
        company.chattools.forEach(async (chattool) => {
          if (chattool.tool_code == ChatToolCode.LINE && company.admin_user) {
            const adminUser = company.admin_user;
            const chatToolUser = chattoolUsers.find(
              (chattoolUser) =>
                chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == adminUser.id
            );

            if (chatToolUser) {
              await this.lineRepo.pushNoListTaskMessageToAdmin(chattool, {
                ...adminUser,
                line_id: chatToolUser.auth_key,
              });
            }
          }
        });
      }

      // ・期日未設定のタスク一覧が1つのメッセージで担当者に送られること
      const notSetDueDateTasks = needRemindTasks.filter(
        (task) =>
          !task.deadline && task.todoUsers.length && task.reminded_count < Common.remindMaxCount
      );

      // Send list task to each user
      if (notSetDueDateTasks.length) {
        const userTodoMap = this.mapUserTaskList(notSetDueDateTasks);

        userTodoMap.forEach(async (todos: ITodo[], userId: number) => {
          company.chattools.forEach(async (chattool) => {
            if (chattool.tool_code == ChatToolCode.LINE) {
              const user = todos[0].user;

              const chatToolUser = chattoolUsers.find(
                (chattoolUser) =>
                  chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == user.id
              );

              if (chatToolUser) {
                await this.lineRepo.pushListTaskMessageToUser(
                  chattool,
                  { ...user, line_id: chatToolUser.auth_key },
                  todos
                );
              }
            }
          });

          await this.updateRemindedCount(todos);
        });
      }

      // 担当者未設定・期日設定済みの場合
      const notSetAssignTasks = needRemindTasks.filter(
        (task) =>
          task.deadline && !task.todoUsers.length && task.reminded_count < Common.remindMaxCount
      );

      if (notSetAssignTasks.length) {
        company.chattools.forEach(async (chattool) => {
          if (chattool.tool_code == ChatToolCode.LINE && company.admin_user) {
            const adminUser = company.admin_user;
            const chatToolUser = chattoolUsers.find(
              (chattoolUser) =>
                chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == adminUser.id
            );

            if (chatToolUser) {
              await this.lineRepo.pushNotAssignListTaskMessageToAdmin(
                chattool,
                { ...adminUser, line_id: chatToolUser.auth_key },
                notSetAssignTasks
              );
            }
          }
        });

        await this.updateRemindedCount(notSetAssignTasks);
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
        status: LineMessageQueueStatus.WAITING_REPLY,
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
