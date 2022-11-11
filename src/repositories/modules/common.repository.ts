import { ICompanyCondition, ISection, ITodoLines, IUser } from './../../types';
import { Repository } from 'typeorm';
import { Service, Container } from 'typedi';
import { AppDataSource } from './../../config/data-source';
import { Section } from './../../entify/section.entity';
import { User } from './../../entify/user.entity';
import { ImplementedTodoApp } from './../../entify/implemented.todoapp.entity';
import logger from '../../logger/winston';
import { LoggerError } from '../../exceptions';
import { Todo } from './../../entify/todo.entity';
import LineRepository from '../line.repository';

@Service()
export default class CommonRepository {
  private sectionRepository: Repository<Section>;
  private userRepository: Repository<User>;
  private implementedTodoAppRepository: Repository<ImplementedTodoApp>;
  private todoRepository: Repository<Todo>;
  private lineBotRepository: LineRepository;

  constructor() {
    this.sectionRepository = AppDataSource.getRepository(Section);
    this.userRepository = AppDataSource.getRepository(User);
    this.implementedTodoAppRepository = AppDataSource.getRepository(ImplementedTodoApp);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.lineBotRepository = Container.get(LineRepository);
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
    hasAppUserId: boolean = true
  ): Promise<IUser[]> => {
    const query = this.userRepository
      .createQueryBuilder('users')
      .innerJoinAndSelect('users.todoAppUsers', 'todo_app_users')
      .leftJoinAndSelect('users.companyCondition', 'm_company_conditions')
      .where('users.company_id = :companyId', { companyId })
      .andWhere('todo_app_users.todoapp_id = :todoappId', { todoappId });
    if (hasAppUserId) {
      query.andWhere('todo_app_users.user_app_id IS NOT NULL');
    } else {
      query.andWhere('todo_app_users.user_app_id IS NULL');
    }

    const users: IUser[] = await query.getMany();
    return users;
  };

  getImplementTodoApp = async (companyId: number, todoappId: number) => {
    const implementTodoApp = await this.implementedTodoAppRepository.findOneBy({
      company_id: companyId,
      todoapp_id: todoappId,
    });

    if (!implementTodoApp) {
      logger.error(
        new LoggerError(
          'implemented_todo_appsのデータ(company_id=' +
            companyId +
            ' todoapp_id=' +
            todoappId +
            ')がありません。'
        )
      );
    }

    return implementTodoApp;
  };

  getDayReminds = async (companyConditions: ICompanyCondition[]): Promise<number[]> => {
    const dayReminds: number[] = companyConditions
      .map((s) => s.remind_before_days)
      .filter(Number.isFinite);

    return dayReminds;
  };

  pushTodoLines = async (dataTodoLines: ITodoLines[]): Promise<void> => {
    for (const todoLine of dataTodoLines) {
      const { todoId, chattool, user, remindDays } = todoLine;

      const todo = await this.todoRepository.findOneBy({
        todoapp_reg_id: todoId,
      });

      if (todo) {
        this.lineBotRepository.pushMessageRemind(
          chattool,
          user,
          { ...todo, assigned_user_id: user.id },
          remindDays
        );
      }
    }
  };
}
