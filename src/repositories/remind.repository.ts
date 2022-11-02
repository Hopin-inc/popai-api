import { AppDataSource } from '../config/data-source';
import { InternalServerErrorException, LoggerError } from '../exceptions';
import { Repository } from 'typeorm';

import { Company } from './../entify/company.entity';
import MicrosoftRepository from './microsoft.repository';
import TrelloRepository from './trello.repository';
import { ITodoApp, IUser } from './../types';
import { Common } from './../const/common';
import { Service, Container } from 'typedi';
import logger from './../logger/winston';
import { Todo } from '../entify/todo.entity';
import { User } from '../entify/user.entity';
import LineRepository from './line.repository';

@Service()
export default class Remindrepository {
  private trelloRepo: TrelloRepository;
  private microsofRepo: MicrosoftRepository;
  private lineRepo: LineRepository;

  private companyRepository: Repository<Company>;
  private todoRepository: Repository<Todo>;
  private userRepository: Repository<User>;

  constructor() {
    this.trelloRepo = Container.get(TrelloRepository);
    this.microsofRepo = Container.get(MicrosoftRepository);
    this.lineRepo = Container.get(LineRepository);
    this.companyRepository = AppDataSource.getRepository(Company);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.userRepository = AppDataSource.getRepository(User);
  }

  remindCompany = async (): Promise<void> => {
    try {
      const companies = await this.companyRepository.find({
        relations: ['todoapps'],
      });

      for (const company of companies) {
        if (company.todoapps.length) {
          this.remindCompanyApp(company.id, company.todoapps);
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  };

  remindCompanyApp = async (companyId: number, todoapps: ITodoApp[]): Promise<void> => {
    for (const todoapp of todoapps) {
      switch (todoapp.todo_app_code) {
        case Common.trello:
          this.trelloRepo.remindUsers(companyId, todoapp.id);
          break;
        case Common.microsoft:
          this.microsofRepo.remindUsers(companyId, todoapp.id);
          break;
        default:
          break;
      }
    }

    const notDateTasks = await this.getNotsetDueDateTasks(companyId);
    const admin = await this.getAdminOfCompany(companyId);

    if (notDateTasks.length) {
      // 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
      // Send to admin list task which not set duedate
      await this.lineRepo.pushListTaskMessageToAdmin(admin, notDateTasks);

      // ・期日未設定のタスク一覧が1つのメッセージで担当者に送られること
      // Send list task to each user
      const userTodoMap = this.mapUserTaskList(notDateTasks);

      userTodoMap.forEach(async (todos: Array<Todo>, user: User) => {
        await this.lineRepo.pushListTaskMessageToUser(user, todos);
      });
    } else {
      // 期日未設定のタスクがない旨のメッセージが管理者に送られること
      await this.lineRepo.pushNoListTaskMessageToAdmin(admin);
    }
  };

  getNotsetDueDateTasks = async (companyId: number): Promise<Array<Todo>> => {
    const todos: Todo[] = await this.todoRepository
      .createQueryBuilder('todos')
      .innerJoinAndSelect('todos.user', 'users')
      .where('users.company_id = :companyId', { companyId })
      .andWhere('todos.deadline IS NULL')
      .getMany();

    return todos;
  };

  getAdminOfCompany = async (companyId: number): Promise<IUser> => {
    // const admin = await this.
    // TODO get admin of companay
    return this.userRepository.findOneBy({ id: 1 });
  };

  mapUserTaskList = (todos: Array<Todo>): Map<User, Array<Todo>> => {
    const map = new Map<User, Array<Todo>>();

    todos.forEach((todo) => {
      if (map.has(todo.user)) {
        map.get(todo.user).push(todo);
      } else {
        map.set(todo.user, [todo]);
      }
    });

    return map;
  };
}
