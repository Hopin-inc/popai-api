import { AppDataSource } from '../config/data-source';
import { LoggerError } from '../exceptions';
import { Repository } from 'typeorm';
import {
  ISection,
  ITodo,
  ITodoAppUser,
  ITodoTask,
  IUser,
  ICompany,
  ITodoApp,
  ITodoUserUpdate,
  ITodoUpdate,
  IRemindTask, ITrelloTask,
} from '../types';

import { Service, Container } from 'typedi';
import { Todo } from '../entify/todo.entity';
import { TodoAppUser } from '../entify/todoappuser.entity';
import { toJapanDateTime, diffDays } from '../utils/common';
import moment from 'moment';
import logger from '../logger/winston';
import TrelloRequest from './../libs/trello.request';
import TodoUserRepository from './modules/todoUser.repository';
import TodoUpdateRepository from './modules/todoUpdate.repository';
import CommonRepository from './modules/common.repository';
import LineQueueRepository from './modules/lineQueue.repository';

@Service()
export default class TrelloRepository {
  private trelloRequest: TrelloRequest;
  private todoRepository: Repository<Todo>;
  private todoUpdateRepository: TodoUpdateRepository;
  private lineQueueRepository: LineQueueRepository;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private todoUserRepository: TodoUserRepository;
  private commonRepository: CommonRepository;

  constructor() {
    this.trelloRequest = Container.get(TrelloRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = Container.get(TodoUpdateRepository);
    this.lineQueueRepository = Container.get(LineQueueRepository);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.todoUserRepository = Container.get(TodoUserRepository);
    this.commonRepository = Container.get(CommonRepository);
  }

  syncTaskByUserBoards = async (company: ICompany, todoapp: ITodoApp): Promise<void> => {
    const companyId = company.id;
    const todoappId = todoapp.id;

    await this.updateUsersTrello(company.users, todoappId);
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
    boardAdminuser: IUser,
    section: ISection,
    todoTasks: ITodoTask[],
    company: ICompany,
    todoapp: ITodoApp
  ): Promise<void> => {
    if (!boardAdminuser?.todoAppUsers.length) return;

    for (const todoAppUser of boardAdminuser.todoAppUsers) {
      if (todoAppUser.api_key && todoAppUser.api_token && section.board_id) {
        try {
          const trelloAuth = this.trelloRequest.generateAuth(todoAppUser);
          const cardTodos = await this.trelloRequest.getAllCardsFromBoard(section.board_id, trelloAuth);

          for (const todoTask of cardTodos) {
            const users = await this.todoUserRepository.getUserAssignTask(
              company.users,
              todoTask.idMembers
            );

            const card: ITodoTask = {
              todoTask: todoTask,
              company: company,
              todoapp: todoapp,
              todoAppUser: todoAppUser,
              section: section,
              users: users,
            };

            const taskFound = todoTasks.find((task) => task.todoTask?.id === todoTask.id);
            if (taskFound) {
              taskFound.users = users;
            } else {
              todoTasks.push(card);
            }
          }
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  };

  updateUsersTrello = async (usersCompany: IUser[], todoappId: number): Promise<void> => {
    const users = usersCompany.filter((user) => {
      return user?.todoAppUsers.find(
        (todoAppUser) => todoAppUser.todoapp_id === todoappId && !todoAppUser.user_app_id
      );
    });

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
          const trelloAuth = this.trelloRequest.generateAuth(todoAppUser);

          const me = await this.trelloRequest.getMyInfo(trelloAuth);
          todoAppUser.user_app_id = me?.id;
          await this.todoAppUserRepository.save(todoAppUser);
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  };

  filterUpdateCards = async (dayReminds: number[], cardTodos: ITodoTask[]): Promise<void> => {
    const cards: IRemindTask[] = [];

    for (const cardTodo of cardTodos) {
      let delayedCount = 0;
      let dayDurations;
      const todoTask = cardTodo.todoTask;

      if (todoTask.due) {
        dayDurations = diffDays(toJapanDateTime(todoTask.due), toJapanDateTime(new Date()));
        delayedCount = dayDurations;
      }

      cards.push({
        remindDays: dayDurations,
        cardTodo: cardTodo,
        delayedCount: delayedCount,
      });
    }

    await this.createTodo(cards);
  };

  createTodo = async (taskReminds: IRemindTask[]): Promise<void> => {
    try {
      if (!taskReminds.length) return;
      const dataTodos: Todo[] = [];
      const dataTodoUpdates: ITodoUpdate[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];

      for (const taskRemind of taskReminds) {
        const cardTodo = taskRemind.cardTodo;
        const { users, todoTask, todoapp, company, section } = cardTodo;

        const todo: ITodo = await this.todoRepository.findOneBy({
          todoapp_reg_id: todoTask.id,
        });

        const taskDeadLine = todoTask.due ? toJapanDateTime(todoTask.due) : null;
        const taskUpdated = toJapanDateTime(todoTask.dateLastActivity);

        const todoData = new Todo();
        todoData.id = todo?.id || null;
        todoData.name = todoTask.name;
        todoData.todoapp_id = todoapp.id;
        todoData.todoapp_reg_id = todoTask.id;
        todoData.todoapp_reg_url = todoTask.shortUrl;
        todoData.todoapp_reg_created_by = null;
        todoData.todoapp_reg_created_at = todo?.todoapp_reg_created_at || taskUpdated;
        todoData.company_id = company.id;
        todoData.section_id = section.id;
        todoData.deadline = taskDeadLine;
        todoData.is_done = todoTask.dueComplete;
        todoData.is_reminded = !!todoTask.dueReminder;
        todoData.is_closed = todoTask.closed;
        todoData.delayed_count = todo?.delayed_count || 0;
        todoData.reminded_count = todo?.reminded_count || 0;

        //set first update task
        if (taskDeadLine) {
          todoData.first_ddl_set_at = todo?.first_ddl_set_at || taskUpdated;
        }

        if (users.length) {
          //set first update task
          todoData.first_assigned_at = todo?.first_assigned_at || taskUpdated;

          dataTodoUsers.push({
            todoId: todoTask.id,
            users: users,
          });
        }

        //update deadline task
        if (taskDeadLine || todoData.is_done) {
          const isDeadlineChanged = !moment(taskDeadLine).isSame(todo?.deadline);
          const isDoneChanged = todo?.is_done !== todoData.is_done;

          if (isDeadlineChanged || isDoneChanged) {
            dataTodoUpdates.push({
              todoId: todoTask.id,
              dueTime: todo?.deadline,
              newDueTime: taskDeadLine,
              updateTime: toJapanDateTime(todoTask.dateLastActivity),
            });
          }

          if (
            !todoData.is_done &&
            taskRemind.delayedCount > 0 &&
            (isDeadlineChanged || !todoData.delayed_count)
          ) {
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
        // await this.lineQueueRepository.pushTodoLineQueues(dataLineQueues);
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  updateTodo = async (id: string, task: Todo, todoAppUser: ITodoAppUser): Promise<void> => {
    try {
      const idMembers = task.todoUsers.map(todoUser => {
        const targetTodoAppUser = todoUser.user.todoAppUsers.find(tau => tau.todoapp_id === todoAppUser.todoapp_id);
        return targetTodoAppUser.user_app_id;
      });
      const trelloTask: Partial<ITrelloTask> = {
        id: task.todoapp_reg_id,
        name: task.name,
        closed: task.is_closed,
        dueComplete: task.is_done,
        due: task.deadline,
        idMembers,
      }
      const trelloAuth = this.trelloRequest.generateAuth(todoAppUser);
      await this.trelloRequest.updateCard(id, trelloTask, trelloAuth);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }
}
