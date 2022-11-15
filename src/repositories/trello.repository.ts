import { AppDataSource } from '../config/data-source';
import { LoggerError } from '../exceptions';
import { Repository } from 'typeorm';
import {
  ISection,
  ITodo,
  ITodoAppUser,
  ITodoTask,
  ITrelloAuth,
  IUser,
  IRemindTask,
  ICompany,
  ITodoApp,
  ITodoUserUpdate,
  ITodoUpdate,
  ITodoLines,
} from './../types';

import { Service, Container } from 'typedi';
import { Todo } from './../entify/todo.entity';
import { TodoAppUser } from './../entify/todoappuser.entity';
import { toJapanDateTime, diffDays } from '../utils/common';
import moment from 'moment';
import logger from './../logger/winston';
import TrelloRequest from './../libs/trello.request';
import LineRepository from './line.repository';
import TodoUserRepository from './modules/todoUser.repository';
import TodoUpdateRepository from './modules/todoUpdate.repository';
import CommonRepository from './modules/common.repository';
import { ChatToolCode, Common } from '../const/common';

@Service()
export default class TrelloRepository {
  private trelloRequest: TrelloRequest;
  private todoRepository: Repository<Todo>;
  private todoUpdateRepository: TodoUpdateRepository;
  private lineBotRepository: LineRepository;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private todoUserRepository: TodoUserRepository;
  private commonRepository: CommonRepository;

  constructor() {
    this.trelloRequest = Container.get(TrelloRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = Container.get(TodoUpdateRepository);
    this.lineBotRepository = Container.get(LineRepository);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.todoUserRepository = Container.get(TodoUserRepository);
    this.commonRepository = Container.get(CommonRepository);
  }

  remindUsers = async (company: ICompany, todoapp: ITodoApp): Promise<void> => {
    const companyId = company.id;
    const todoappId = todoapp.id;
    await this.updateUsersTrello(companyId, todoappId);
    const sections = await this.commonRepository.getSections(companyId, todoappId);

    await this.getUserCardBoards(sections, company, todoapp);
  };

  getUserCardBoards = async (
    sections: ISection[],
    company: ICompany,
    todoapp: ITodoApp
  ): Promise<void> => {
    try {
      const todoTasks: ITodoTask[] = [];

      for (const section of sections) {
        await this.getCardBoards(section.boardAdminUser, section, todoTasks, company, todoapp);
      }

      const dayReminds: number[] = await this.commonRepository.getDayReminds(
        company.companyConditions
      );
      await this.filterUpdateCards(dayReminds, todoTasks);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getCardBoards = async (
    user: IUser,
    section: ISection,
    todoTasks: ITodoTask[],
    company: ICompany,
    todoapp: ITodoApp
  ): Promise<void> => {
    if (!user?.todoAppUsers.length) return;

    for (const todoAppUser of user.todoAppUsers) {
      if (todoAppUser.api_key && todoAppUser.api_token && section.board_id) {
        try {
          const trelloAuth: ITrelloAuth = {
            api_key: todoAppUser.api_key,
            api_token: todoAppUser.api_token,
          };
          const cardTodos = await this.trelloRequest.fetchApi(
            'boards/' + section.board_id + '/cards/all',
            'GET',
            {},
            trelloAuth
          );

          for (const todoTask of cardTodos) {
            const card: ITodoTask = {
              todoTask: todoTask,
              company: company,
              todoapp: todoapp,
              todoAppUser: todoAppUser,
              section: section,
              users: [],
            };

            const taskFound = todoTasks.find((task) => task.todoTask?.id === todoTask.id);
            if (taskFound) {
              if (taskFound.todoTask.idMembers.includes(todoAppUser.user_app_id)) {
                taskFound.users.push(user);
              }
            } else {
              if (todoTask.idMembers.includes(todoAppUser.user_app_id)) {
                card.users = [user];
              }
              todoTasks.push(card);
            }
          }
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  };

  updateUsersTrello = async (companyId: number, todoappId: number): Promise<void> => {
    const users = await this.commonRepository.getUserTodoApps(companyId, todoappId, false);
    for await (const user of users) {
      if (user.todoAppUsers.length) {
        await this.updateTrelloUser(user.todoAppUsers);
      }
    }
  };

  updateTrelloUser = async (todoAppUsers: ITodoAppUser[]): Promise<any> => {
    for (const todoAppUser of todoAppUsers) {
      if (todoAppUser.api_key && todoAppUser.api_token) {
        try {
          const trelloAuth: ITrelloAuth = {
            api_key: todoAppUser.api_key,
            api_token: todoAppUser.api_token,
          };

          const me = await this.trelloRequest.fetchApi('members/me', 'GET', {}, trelloAuth);
          todoAppUser.user_app_id = me?.id;
          await this.todoAppUserRepository.save(todoAppUser);
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  };

  filterUpdateCards = async (dayReminds: number[], cardTodos: ITodoTask[]): Promise<void> => {
    const cardReminds: IRemindTask[] = [];
    const cardNomals: IRemindTask[] = [];

    for (const cardTodo of cardTodos) {
      let hasRemind = false;
      let delayedCount = 0;
      const todoTask = cardTodo.todoTask;

      if (todoTask.due) {
        const dayDurations = diffDays(todoTask.due, new Date());
        delayedCount = dayDurations;

        if (dayReminds.includes(dayDurations) && !todoTask.dueComplete) {
          hasRemind = true;
          cardReminds.push({
            remindDays: dayDurations,
            cardTodo: cardTodo,
            delayedCount: delayedCount,
          });
        }
      }

      if (!hasRemind) {
        cardNomals.push({
          remindDays: 0,
          cardTodo: cardTodo,
          delayedCount: delayedCount,
        });
      }
    }

    await this.createTodo(cardReminds, true);
    await this.createTodo(cardNomals);
  };

  createTodo = async (taskReminds: IRemindTask[], isRemind: boolean = false): Promise<void> => {
    try {
      if (!taskReminds.length) return;
      const dataTodos: Todo[] = [];
      const dataTodoUpdates: ITodoUpdate[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];
      const dataTodoLines: ITodoLines[] = [];
      // const pushUserIds = [];

      const chattoolUsers = await this.commonRepository.getChatToolUsers();
      const today = toJapanDateTime(new Date());

      for (const taskRemind of taskReminds) {
        const cardTodo = taskRemind.cardTodo;
        const { users, todoTask, todoapp, company, section } = cardTodo;

        // if (isRemind && user && !pushUserIds.includes(user.id)) {
        //   // send to admin of user
        //   pushUserIds.push(user.id);
        //   await this.lineBotRepository.pushStartReportToAdmin(user);
        // }

        const todo: ITodo = await this.todoRepository.findOneBy({
          todoapp_reg_id: todoTask.id,
        });

        const taskDeadLine = todoTask.due ? toJapanDateTime(todoTask.due) : null;

        const todoData = new Todo();
        todoData.id = todo?.id || null;
        todoData.name = todoTask.name;
        todoData.todoapp_id = todoapp.id;
        todoData.todoapp_reg_id = todoTask.id;
        todoData.todoapp_reg_url = todoTask.shortUrl;
        todoData.todoapp_reg_created_by = null;
        todoData.todoapp_reg_created_at = toJapanDateTime(todoTask.dateLastActivity);
        todoData.company_id = company.id;
        todoData.section_id = section.id;
        todoData.deadline = taskDeadLine;
        todoData.is_done = todoTask.dueComplete;
        todoData.is_reminded = todoTask.dueReminder ? true : false;
        todoData.is_closed = todoTask.closed;
        todoData.delayed_count = todo?.delayed_count || 0;
        todoData.reminded_count = todo?.reminded_count || 0;

        if (users.length) {
          dataTodoUsers.push({
            todoId: todoTask.id,
            users: users,
          });

          if (isRemind && !todoTask.closed && todoData.reminded_count < Common.remindMaxCount) {
            todoData.reminded_count = todoData.reminded_count + 1;

            // send Line message
            for (const user of users) {
              company.chattools.forEach(async (chattool) => {
                if (chattool.tool_code == ChatToolCode.LINE) {
                  const chatToolUsers = chattoolUsers.find(
                    (chattoolUser) =>
                      chattoolUser.chattool_id == chattool.id && chattoolUser.user_id == user.id
                  );

                  if (chatToolUsers) {
                    dataTodoLines.push({
                      todoId: todoTask.id,
                      remindDays: taskRemind.remindDays,
                      chattool: chattool,
                      user: { ...user, line_id: chatToolUsers.auth_key },
                    });
                  }
                }
              });
            }
          }
        }

        //update deadline task
        if (taskDeadLine || todoData.is_done) {
          const deadlineIsChanged = !moment(taskDeadLine).isSame(todo?.deadline);
          const isDelayed = moment(today).isAfter(taskDeadLine);
          const isDoneChanged = todo?.is_done !== todoData.is_done;

          if (deadlineIsChanged || isDoneChanged) {
            dataTodoUpdates.push({
              todoId: todoTask.id,
              dueTime: todo?.deadline,
              newDueTime: taskDeadLine,
              updateTime: toJapanDateTime(todoTask.dateLastActivity),
            });
          }

          if (!todoData.is_done && isDelayed && !deadlineIsChanged) {
            todoData.delayed_count = todoData.delayed_count + 1;
          }
        }

        dataTodos.push(todoData);

        //update user
        if (todo) {
          this.todoUserRepository.updateTodoUser(todo, users);
        }
      }

      const response = await this.todoRepository.upsert(dataTodos, []);

      if (response) {
        await this.todoUpdateRepository.saveTodoHistories(dataTodoUpdates);
        await this.todoUserRepository.saveTodoUsers(dataTodoUsers);
        await this.lineBotRepository.pushTodoLines(dataTodoLines);
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };
}
