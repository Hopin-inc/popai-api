import { AppDataSource } from '../config/data-source';
import { User } from '../entify/user.entity';
import { LoggerError } from '../exceptions';
import { Repository } from 'typeorm';
import moment from 'moment';
import logger from './../logger/winston';
import {
  ICompanyCondition,
  ITodo,
  ITodoAppUser,
  ITrelloAuth,
  ITrelloTask,
  IUser,
} from './../types';
import TrelloRequest from './../libs/trello.request';
import { Service, Container } from 'typedi';
import { Todo } from './../entify/todo.entity';
import LineRepository from './line.repository';
import { TodoUpdateHistory } from './../entify/todoupdatehistory.entity';

@Service()
export default class TrelloRepository {
  private userRepository: Repository<User>;
  private trelloRequest: TrelloRequest;
  private todoRepository: Repository<Todo>;
  private todoUpdateRepository: Repository<TodoUpdateHistory>;
  private lineBotRepository: LineRepository;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.trelloRequest = Container.get(TrelloRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = AppDataSource.getRepository(TodoUpdateHistory);
    this.lineBotRepository = Container.get(LineRepository);
  }

  getUserTodoApps = async (companyId: number, todoappId: number): Promise<IUser[]> => {
    const users: IUser[] = await this.userRepository
      .createQueryBuilder('users')
      .innerJoinAndSelect('users.todoAppUsers', 'todo_app_users')
      .leftJoinAndSelect('users.companyCondition', 'm_company_conditions')
      .where('users.company_id = :companyId', { companyId })
      .andWhere('todo_app_users.todoapp_id = :todoappId', { todoappId })
      .getMany();
    return users;
  };

  remindUsers = async (companyId: number, todoappId: number): Promise<void> => {
    const users = await this.getUserTodoApps(companyId, todoappId);

    if (!users.length) {
      return;
    }

    for (const user of users) {
      if (user.todoAppUsers.length) {
        this.remindUserByTodoApp(user, user.todoAppUsers);
      }
    }
  };

  remindUserByTodoApp = async (user: IUser, todoAppUsers: ITodoAppUser[]): Promise<void> => {
    for (const todoAppUser of todoAppUsers) {
      if (todoAppUser.api_key && todoAppUser.api_token) {
        this.getCardRemindByUser(user, todoAppUser);
      }
    }
  };

  getCardRemindByUser = async (user: IUser, todoAppUser: ITodoAppUser): Promise<void> => {
    try {
      const trelloAuth: ITrelloAuth = {
        api_key: todoAppUser.api_key,
        api_token: todoAppUser.api_token,
      };

      const cardTodos = await this.trelloRequest.fetchApi(
        'members/me/cards',
        'GET',
        {},
        trelloAuth
      );
      await this.filterUpdateCards(user, todoAppUser, cardTodos);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  getDayReminds = async (companyCondition: ICompanyCondition[]): Promise<number[]> => {
    const dayReminds: number[] = companyCondition
      .map((s) => s.remind_before_days)
      .filter(Number.isFinite);

    return dayReminds;
  };

  filterUpdateCards = async (
    user: IUser,
    todoAppUser: ITodoAppUser,
    cardTodos: ITrelloTask[]
  ): Promise<void> => {
    const cardReminds: ITrelloTask[] = [];
    const cardNomals: ITrelloTask[] = [];

    const dayReminds: number[] = await this.getDayReminds(user.companyCondition);

    for (const todoTask of cardTodos) {
      let hasRemind = false;

      if (todoTask.due && !todoTask.dueComplete) {
        const dateExpired = moment(todoTask.due).startOf('day');
        const dateNow = moment().startOf('day');

        const duration = moment.duration(dateExpired.diff(dateNow));
        const day = duration.asDays();

        if (dayReminds.includes(day)) {
          hasRemind = true;
          cardReminds.push(todoTask);
        }
      }

      if (!hasRemind) {
        cardNomals.push(todoTask);
      }
    }

    this.createTodo(user, todoAppUser, cardReminds, true);

    this.createTodo(user, todoAppUser, cardNomals);
  };

  createTodo = async (
    user: IUser,
    todoAppUser: ITodoAppUser,
    taskReminds: ITrelloTask[],
    isRemind: boolean = false
  ): Promise<void> => {
    try {
      if (!taskReminds.length) return;
      const dataTodos = [];
      const dataTodoIDUpdates = [];

      if (isRemind) {
        // send to admin of user
        await this.lineBotRepository.pushStartReportToAdmin(user);
      }

      for (const todoTask of taskReminds) {
        const todoData = new Todo();
        todoData.name = todoTask.name;
        todoData.todoapp_id = todoAppUser.todoapp_id;
        todoData.todoapp_reg_id = todoTask.id;
        todoData.todoapp_reg_url = todoTask.shortUrl;
        todoData.todoapp_reg_created_by = null;
        todoData.todoapp_reg_created_at = moment(todoTask.dateLastActivity).toDate();
        todoData.assigned_user_id = todoAppUser.employee_id;
        todoData.deadline = moment(todoTask.due).toDate();
        todoData.is_done = todoTask.dueComplete;
        todoData.is_reminded = todoTask.dueReminder ? true : false;
        todoData.is_rescheduled = null;
        dataTodos.push(todoData);

        if (isRemind) {
          // send Line message
          this.lineBotRepository.pushMessageRemind(user, todoData);
        }

        if (todoTask.dateLastActivity) {
          dataTodoIDUpdates.push({
            todoId: todoTask.id,
            updateTime: moment(todoTask.dateLastActivity).toDate(),
          });
        }
      }

      const response = await this.todoRepository.upsert(dataTodos, []);

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
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
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
