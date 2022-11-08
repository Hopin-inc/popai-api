import { AppDataSource } from '../config/data-source';
import { User } from '../entify/user.entity';
import { LoggerError } from '../exceptions';
import { Repository } from 'typeorm';
import moment from 'moment';
import logger from './../logger/winston';
import {
  ISection,
  ICompanyCondition,
  ITodo,
  ITodoAppUser,
  ITodoTask,
  ITrelloAuth,
  IUser,
  IRemindTask,
  ICompany,
  ITodoApp,
  ITodoUserUpdate,
  ITodoUser,
} from './../types';
import TrelloRequest from './../libs/trello.request';
import { Service, Container } from 'typedi';
import { Todo } from './../entify/todo.entity';
import LineRepository from './line.repository';
import { TodoUpdateHistory } from './../entify/todoupdatehistory.entity';
import { Section } from '../entify/section.entity';
import { TodoAppUser } from './../entify/todoappuser.entity';
import { toJapanDateTime } from '../utils/common';
import { TodoUser } from './../entify/todouser.entity';

@Service()
export default class TrelloRepository {
  private userRepository: Repository<User>;
  private sectionRepository: Repository<Section>;
  private trelloRequest: TrelloRequest;
  private todoRepository: Repository<Todo>;
  private todoUpdateRepository: Repository<TodoUpdateHistory>;
  private lineBotRepository: LineRepository;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private todoUserRepository: Repository<TodoUser>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.sectionRepository = AppDataSource.getRepository(Section);
    this.trelloRequest = Container.get(TrelloRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = AppDataSource.getRepository(TodoUpdateHistory);
    this.lineBotRepository = Container.get(LineRepository);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.todoUserRepository = AppDataSource.getRepository(TodoUser);
  }

  getSections = async (companyId: number, todoappId: number): Promise<ISection[]> => {
    const sections: ISection[] = await this.sectionRepository
      .createQueryBuilder('sections')
      .where('sections.company_id = :companyId', { companyId })
      .andWhere('sections.todoapp_id = :todoappId', { todoappId })
      .getMany();
    return sections;
  };

  getUserTodoApps = async (
    companyId: number,
    todoappId: number,
    hasTrelloId: boolean = true
  ): Promise<IUser[]> => {
    const query = this.userRepository
      .createQueryBuilder('users')
      .innerJoinAndSelect('users.todoAppUsers', 'todo_app_users')
      .leftJoinAndSelect('users.companyCondition', 'm_company_conditions')
      .where('users.company_id = :companyId', { companyId })
      .andWhere('todo_app_users.todoapp_id = :todoappId', { todoappId });
    if (hasTrelloId) {
      query.andWhere('todo_app_users.user_app_id IS NOT NULL');
    } else {
      query.andWhere('todo_app_users.user_app_id IS NULL');
    }

    const users: IUser[] = await query.getMany();
    return users;
  };

  remindUsers = async (company: ICompany, todoapp: ITodoApp): Promise<void> => {
    const companyId = company.id;
    const todoappId = todoapp.id;
    await this.updateUsersTrello(companyId, todoappId);
    const sections = await this.getSections(companyId, todoappId);
    const users = await this.getUserTodoApps(companyId, todoappId);
    await this.getUserCardBoards(users, sections, company, todoapp);
  };

  getUserCardBoards = async (
    users: IUser[],
    sections: ISection[],
    company: ICompany,
    todoapp: ITodoApp
  ): Promise<void> => {
    try {
      const todoTasks: ITodoTask[] = [];
      for await (const user of users) {
        for (const section of sections) {
          await this.getCardBoards(user, section, todoTasks, company, todoapp);
        }
      }

      const dayReminds: number[] = await this.getDayReminds(company.companyConditions);
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
    if (!user.todoAppUsers.length) return;

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
              sectionId: section.id,
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
    const users = await this.getUserTodoApps(companyId, todoappId, false);
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

  getDayReminds = async (companyConditions: ICompanyCondition[]): Promise<number[]> => {
    const dayReminds: number[] = companyConditions
      .map((s) => s.remind_before_days)
      .filter(Number.isFinite);

    return dayReminds;
  };

  filterUpdateCards = async (dayReminds: number[], cardTodos: ITodoTask[]): Promise<void> => {
    const cardReminds: IRemindTask[] = [];
    const cardNomals: IRemindTask[] = [];

    for (const cardTodo of cardTodos) {
      let hasRemind = false;

      const companyConditions = cardTodo.company.companyConditions;
      const todoTask = cardTodo.todoTask;

      if (companyConditions && todoTask.due && !todoTask.dueComplete) {
        const dayReminds: number[] = await this.getDayReminds(companyConditions);
        const dateExpired = moment(toJapanDateTime(todoTask.due)).startOf('day');
        const dateNow = moment(toJapanDateTime(new Date())).startOf('day');

        const diffDays = dateExpired.diff(dateNow, 'days');
        const day = dateExpired.isAfter(dateNow) ? 0 - diffDays : diffDays;

        if (dayReminds.includes(day)) {
          hasRemind = true;
          cardReminds.push({
            remindDays: day,
            cardTodo: cardTodo,
          });
        }
      }

      if (!hasRemind) {
        cardNomals.push({
          remindDays: 0,
          cardTodo: cardTodo,
        });
      }
    }

    await this.createTodo(cardReminds, true);
    await this.createTodo(cardNomals);
  };

  createTodo = async (taskReminds: IRemindTask[], isRemind: boolean = false): Promise<void> => {
    try {
      if (!taskReminds.length) return;
      const dataTodos = [];
      const dataTodoIDUpdates = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];
      // const pushUserIds = [];

      for (const taskRemind of taskReminds) {
        const cardTodo = taskRemind.cardTodo;
        const users = cardTodo.users;
        const todoTask = cardTodo.todoTask;

        const todoappId = cardTodo.todoapp.id;
        const companyId = cardTodo.company.id;
        const sectionId = cardTodo.sectionId;

        // if (isRemind && user && !pushUserIds.includes(user.id)) {
        //   // send to admin of user
        //   pushUserIds.push(user.id);
        //   await this.lineBotRepository.pushStartReportToAdmin(user);
        // }

        const todo: ITodo = await this.todoRepository.findOneBy({
          todoapp_reg_id: todoTask.id,
        });

        const todoData = new Todo();
        todoData.id = todo?.id || null;
        todoData.name = todoTask.name;
        todoData.todoapp_id = todoappId;
        todoData.todoapp_reg_id = todoTask.id;
        todoData.todoapp_reg_url = todoTask.shortUrl;
        todoData.todoapp_reg_created_by = null;
        todoData.todoapp_reg_created_at = toJapanDateTime(todoTask.dateLastActivity);
        todoData.company_id = companyId;
        todoData.section_id = sectionId;
        // if (user) {
        //   todoData.assigned_user_id = user.id;
        // }
        todoData.deadline = toJapanDateTime(todoTask.due);
        todoData.is_done = todoTask.dueComplete;
        todoData.is_reminded = todoTask.dueReminder ? true : false;
        todoData.is_rescheduled = null;
        todoData.is_closed = todoTask.closed;

        if (users.length) {
          dataTodoUsers.push({
            todoId: todoTask.id,
            users: users,
          });

          if (isRemind && !todoTask.closed) {
            todoData.reminded_count = 1;
            // send Line message
            for (const user of users) {
              this.lineBotRepository.pushMessageRemind(
                user,
                { ...todoData, assigned_user_id: user.id },
                taskRemind.remindDays
              );
            }
          }
        }

        dataTodos.push(todoData);

        if (todoTask.dateLastActivity) {
          dataTodoIDUpdates.push({
            todoId: todoTask.id,
            updateTime: toJapanDateTime(todoTask.dateLastActivity),
          });
        }

        //Update USER
        if (todo) {
          this.updateTodoUser(todo, users);
        }
      }

      //save todos
      const response = await this.todoRepository.upsert(dataTodos, []);

      //save todohistories
      if (response && dataTodoIDUpdates.length) {
        for (const dataUpdate of dataTodoIDUpdates) {
          const todo: ITodo = await this.todoRepository.findOneBy({
            todoapp_reg_id: dataUpdate.todoId,
          });

          if (todo) {
            this.saveTodoHistory(todo, dataUpdate.updateTime);
          }
        }
      }

      //save todo users
      await this.saveTodoUsers(dataTodoUsers);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  updateTodoUser = async (todo: ITodo, users: IUser[]): Promise<void> => {
    const todoUsers: ITodoUser[] = await this.todoUserRepository.findBy({
      todo_id: todo.id,
    });

    const todoUserIds: number[] = todoUsers.map((s) => s.user_id).filter(Number);
    const userIds: number[] = users.map((s) => s.id).filter(Number);

    const differenceUserIds = todoUserIds
      .filter((x) => !userIds.includes(x))
      .concat(userIds.filter((x) => !todoUserIds.includes(x)));

    if (differenceUserIds.length) {
      const idTodoUsers: number[] = todoUsers
        .filter(function(obj) {
          return differenceUserIds.includes(obj.user_id);
        })
        .map((s) => s.id)
        .filter(Number);

      if (idTodoUsers.length) {
        await this.todoUserRepository.delete(idTodoUsers);
      }
    }
  };

  saveTodoUsers = async (dataTodoUsers: ITodoUserUpdate[]): Promise<void> => {
    //todo
    const todoUserDatas = [];

    for await (const dataTodoUser of dataTodoUsers) {
      const todo: ITodo = await this.todoRepository.findOneBy({
        todoapp_reg_id: dataTodoUser.todoId,
      });

      if (todo) {
        for (const user of dataTodoUser.users) {
          const todoUser: ITodoUser = await this.todoUserRepository.findOneBy({
            todo_id: todo.id,
            user_id: user.id,
          });

          const todoUserData = new TodoUser();
          todoUserData.id = todoUser?.id || null;
          todoUserData.todo_id = todo.id;
          todoUserData.user_id = user.id;
          todoUserDatas.push(todoUserData);
        }
      }
    }

    await this.todoUserRepository.upsert(todoUserDatas, []);
  };

  saveTodoHistory = async (todo: ITodo, updateTime: Date) => {
    try {
      const todoUpdateData = await this.todoUpdateRepository.findOne({
        where: { todo_id: todo.id },
        order: { id: 'DESC' },
      });

      const taskUpdate = moment(updateTime).format('YYYY-MM-DD HH:mm:ss');

      if (todoUpdateData) {
        const oldDate = moment(todoUpdateData.todoapp_reg_updated_at).format('YYYY-MM-DD HH:mm:ss');
        if (moment(oldDate).isSame(taskUpdate)) {
          return;
        }
      }

      const todoUpdate = new TodoUpdateHistory();
      todoUpdate.todo_id = todo.id;
      todoUpdate.todoapp_reg_updated_at = moment(taskUpdate).toDate();
      this.todoUpdateRepository.save(todoUpdate);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };
}
