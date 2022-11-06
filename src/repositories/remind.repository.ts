import { AppDataSource } from '../config/data-source';
import { InternalServerErrorException, LoggerError } from '../exceptions';
import { Brackets, Repository } from 'typeorm';

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
        relations: ['todoapps', 'admin_user'],
      });

      for (const company of companies) {
        if (company.todoapps.length) {
          this.remindCompanyApp(company, company.todoapps);
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  };

  remindCompanyApp = async (company: Company, todoapps: ITodoApp[]): Promise<void> => {
    for (const todoapp of todoapps) {
      switch (todoapp.todo_app_code) {
        case Common.trello:
          await this.trelloRepo.remindUsers(company.id, todoapp.id);
          break;
        case Common.microsoft:
          await this.microsofRepo.remindUsers(company.id, todoapp.id);
          break;
        default:
          break;
      }
    }

    if (!company.admin_user) {
      logger.error(new LoggerError(company.name + 'の管理者が設定していません。'));
    }

    const needRemindTasks = await this.getNotsetDueDateOrNotAssignTasks(company.id);

    // 期日未設定のタスクがない旨のメッセージが管理者に送られること
    if (needRemindTasks.length) {
      // 期日未設定のタスクがある場合

      const notSetDueDateAndNotAssign = needRemindTasks.filter(
        (task) => !task.deadline && !task.assigned_user_id
      );

      if (notSetDueDateAndNotAssign.length) {
        // 期日未設定のタスク一覧が1つのメッセージで管理者に送られること
        // Send to admin list task which not set duedate
        await this.lineRepo.pushListTaskMessageToAdmin(
          company.admin_user,
          notSetDueDateAndNotAssign
        );
      } else {
        await this.lineRepo.pushNoListTaskMessageToAdmin(company.admin_user);
      }

      // ・期日未設定のタスク一覧が1つのメッセージで担当者に送られること

      const notSetDueDateTasks = needRemindTasks.filter(
        (task) =>
          !task.deadline && task.assigned_user_id && task.reminded_count < Common.remindMaxCount
      );

      // Send list task to each user
      if (notSetDueDateTasks.length) {
        const userTodoMap = this.mapUserTaskList(notSetDueDateTasks);

        userTodoMap.forEach(async (todos: Array<Todo>, lineId: string) => {
          await this.lineRepo.pushListTaskMessageToUser(todos[0].user, todos);
          const todoDatas = todos.map((todo) => {
            return {
              ...todo,
              reminded_count: todo.reminded_count + 1,
            };
          });
          await this.todoRepository.upsert(todoDatas, []);
        });
      }
    }
  };

  getNotsetDueDateOrNotAssignTasks = async (companyId: number): Promise<Array<Todo>> => {
    const todos: Todo[] = await this.todoRepository
      .createQueryBuilder('todos')
      .leftJoinAndSelect('todos.user', 'users')
      .where('todos.company_id = :companyId', { companyId })
      .andWhere('todos.is_closed =:closed', { closed: false })
      .andWhere(
        new Brackets((qb) => {
          qb.where('todos.deadline IS NULL').orWhere('todos.assigned_user_id IS NULL');
        })
      )
      // .andWhere(
      //   new Brackets((qb) => {
      //     qb.where('todos.reminded_count < :count', {
      //       count: 2,
      //     });
      //   })
      // )
      .getMany();

    return todos;
  };

  mapUserTaskList = (todos: Array<Todo>): Map<string, Array<Todo>> => {
    const map = new Map<string, Array<Todo>>();

    todos.forEach((todo) => {
      if (map.has(todo.user.line_id)) {
        map.get(todo.user.line_id).push(todo);
      } else {
        map.set(todo.user.line_id, [todo]);
      }
    });

    return map;
  };
}
