import { AppDataSource } from '../config/data-source';
import { User } from '../entify/user.entity';
import { InternalServerErrorException } from '../exceptions';
import { Repository } from 'typeorm';
import moment from 'moment';
import { Common } from './../const/common';
import { ITodoAppUser, ITrelloTask, IUser } from './../types';
import TrelloRequest from './../libs/trello.request';
import { Service, Container } from 'typedi';
import { Todo } from './../entify/todo.entity';
import LineRepository from './line.repository';

@Service()
export default class TrelloRepository {
  private userRepository: Repository<User>;
  private trelloRequest: TrelloRequest;
  private todoRepository: Repository<Todo>;
  private lineBotRepository: LineRepository;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.trelloRequest = Container.get(TrelloRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.lineBotRepository = Container.get(LineRepository);
  }

  getUserTodoApps = async (companyId: number, todoappId: number): Promise<IUser[]> => {
    const users: IUser[] = await this.userRepository
      .createQueryBuilder('users')
      .leftJoinAndSelect('users.todoAppUsers', 'todo_app_users')
      .where('users.company_id = :companyId', { companyId })
      .where('todo_app_users.todoapp_id = :todoappId', { todoappId })
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
    console.log(JSON.stringify(user));
    for (const todoAppUser of todoAppUsers) {
      if (todoAppUser.api_key && todoAppUser.api_token) {
        this.getCardRemindByUser(user, todoAppUser);
      }
    }
  };

  getCardRemindByUser = async (user: IUser, todoAppUser: ITodoAppUser): Promise<void> => {
    try {
      this.trelloRequest.setAuth(todoAppUser.api_key, todoAppUser.api_token);
      const cardTodos = await this.trelloRequest.fetchApi('members/me/cards', 'GET');
      const taskReminds = await this.findCardRemind(cardTodos);
      this.createTodo(user, todoAppUser, taskReminds);
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  };

  findCardRemind = async (cardTodos: ITrelloTask[]): Promise<ITrelloTask[]> => {
    const cardReminds: ITrelloTask[] = [];

    for (const todoTask of cardTodos) {
      this.updateTodo(todoTask);
      if (todoTask.due && !todoTask.dueComplete) {
        const dateExpired = moment(todoTask.due);
        const dateNow = moment().add(Common.day_remind, 'days');
        if (dateNow.isSameOrAfter(dateExpired)) {
          cardReminds.push(todoTask);
        }
      }
    }

    return cardReminds;
  };

  createTodo = async (user: IUser, todoAppUser: ITodoAppUser, taskReminds: any): Promise<void> => {
    if (!taskReminds.length) return;
    const dataTodos = [];

    // send to admin of user
    await this.lineBotRepository.pushStartReportToAdmin(user);

    for (const todoTask of taskReminds) {
      const todoData = new Todo();
      todoData.name = todoTask.name;
      todoData.todoapp_id = todoAppUser.todoapp_id;
      todoData.todoapp_reg_id = todoTask.id;
      todoData.todoapp_reg_created_by = null;
      todoData.todoapp_reg_created_at = moment(todoTask.dateLastActivity).toDate();
      todoData.assigned_user_id = todoAppUser.employee_id;
      todoData.deadline = moment(todoTask.due).toDate();
      todoData.is_done = todoTask.dueComplete;
      todoData.is_reminded = todoTask.dueReminder ? true : false;
      todoData.is_rescheduled = null;
      dataTodos.push(todoData);

      // send Line message
      this.lineBotRepository.pushMessageRemind(user, todoData);
    }

    await this.todoRepository.upsert(dataTodos, []);
  };

  updateTodo = async (todoTask: ITrelloTask): Promise<void> => {
    const todo = await this.todoRepository.findOneBy({
      todoapp_reg_id: todoTask.id,
    });
    if (todo) {
      todo.name = todoTask.name;
      todo.deadline = moment(todoTask.due).toDate();
      todo.is_done = todoTask.dueComplete;
      todo.is_reminded = todoTask.dueReminder ? true : false;
      await this.todoRepository.save(todo);
    }
  };
}
