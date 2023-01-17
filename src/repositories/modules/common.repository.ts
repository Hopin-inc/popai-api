import { ICompanyCondition, ISection, ISectionLabel, IUser } from "../../types";
import { Brackets, IsNull, Not, Repository, SelectQueryBuilder } from "typeorm";
import { Service } from "typedi";
import { AppDataSource } from "../../config/data-source";
import { Section } from "../../entify/section.entity";
import { User } from "../../entify/user.entity";
import { ImplementedTodoApp } from "../../entify/implemented.todoapp.entity";
import logger from "../../logger/winston";
import { LoggerError } from "../../exceptions";
import { Todo } from "../../entify/todo.entity";
import { ChatToolUser } from "../../entify/chattool.user.entity";
import { TodoUser } from "../../entify/todouser.entity";
import { Common } from "../../const/common";
import { SectionLabel } from "../../entify/sectionLabel.entity";

@Service()
export default class CommonRepository {
  private sectionRepository: Repository<Section>;
  private labelSectionRepository: Repository<SectionLabel>;
  private userRepository: Repository<User>;
  private implementedTodoAppRepository: Repository<ImplementedTodoApp>;
  private chatToolUserRepository: Repository<ChatToolUser>;
  private todoRepository: Repository<Todo>;

  constructor() {
    this.sectionRepository = AppDataSource.getRepository(Section);
    this.labelSectionRepository = AppDataSource.getRepository(SectionLabel);
    this.userRepository = AppDataSource.getRepository(User);
    this.implementedTodoAppRepository = AppDataSource.getRepository(ImplementedTodoApp);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.chatToolUserRepository = AppDataSource.getRepository(ChatToolUser);
  }

  getSections = async (companyId: number, todoappId: number): Promise<ISection[]> => {
    return await this.sectionRepository
      .createQueryBuilder('sections')
      .innerJoinAndSelect(
        'sections.boardAdminUser',
        'users',
        'sections.board_admin_user_id = users.id AND users.company_id = :companyId',
        { companyId }
      )
      .innerJoinAndSelect(
        'users.todoAppUsers',
        'todo_app_users',
        'users.id = todo_app_users.employee_id AND todo_app_users.todoapp_id = :todoappId',
        { todoappId }
      )
      .where('sections.company_id = :companyId', { companyId })
      .andWhere('sections.todoapp_id = :todoappId', { todoappId })
      .andWhere('sections.board_id IS NOT NULL')
      .getMany();
  };

  getSectionLabels = async (companyId: number, todoappId: number): Promise<ISectionLabel[]> => {
    return this.labelSectionRepository
      .createQueryBuilder('section_labels')
      .innerJoinAndSelect(
        'section_labels.section',
        'sections',
        'section_labels.section_id = sections.id'
      )
      .where('sections.company_id = :companyId', { companyId })
      .andWhere('sections.todoapp_id = :todoappId', { todoappId })
      .andWhere('section_labels.label_id IS NOT NULL')
      .getMany();
  };

  getBoardAdminUser = async (sectionId: number): Promise<User> => {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ['boardAdminUser', 'boardAdminUser.todoAppUsers']
    });
    return section.boardAdminUser;
  }

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

    return await query.getMany();
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

  getChatToolUsers = async () => {
    return await this.chatToolUserRepository.find();
  };

  getChatToolUser = async (userId: number, chatToolId: number) => {
    const chatToolUser = await this.chatToolUserRepository.findOneBy({
      user_id: userId,
      chattool_id: chatToolId,
      auth_key: Not(IsNull()),
    });

    if (!chatToolUser) {
      logger.error(
        new LoggerError(
          'chat_tool_usersのデータ(user_id=' +
            userId +
            ' chattool_id=' +
            chatToolId +
            ')がありません。'
        )
      );
    }

    return chatToolUser;
  };

  getChatToolUserByUserId = async (authKey: string) => {
    return await this.userRepository
      .createQueryBuilder('users')
      .innerJoin('chat_tool_users', 'r', 'users.id = r.user_id')
      .innerJoinAndMapMany(
        'users.chattools',
        'm_chat_tools',
        'c',
        'c.id = r.chattool_id AND r.auth_key = :authKey',
        { authKey }
      )
      .getMany();
  };

  getDayReminds = async (companyConditions: ICompanyCondition[]): Promise<number[]> => {
    return companyConditions
      .map((s) => s.remind_before_days)
      .filter(Number.isFinite);
  };

  getTodoDueDateAndAssignedTasks = async (companyId: number): Promise<Array<Todo>> => {
    return await this.todoRepository
      .createQueryBuilder('todos')
      .innerJoinAndSelect('todos.todoUsers', 'todo_users')
      .innerJoinAndSelect('todo_users.user', 'users')
      .where('todos.company_id = :companyId', { companyId })
      .andWhere('todos.is_done =:done', { done: false })
      .andWhere('todos.is_closed =:closed', { closed: false })
      .andWhere('todos.deadline IS NOT NULL')
      .andWhere('todos.reminded_count < :count', {
        count: Common.remindMaxCount,
      })
      .getMany();
  };

  getNotsetDueDateOrNotAssignTasks = async (companyId: number): Promise<Array<Todo>> => {
    const notExistsQuery = <T>(builder: SelectQueryBuilder<T>) =>
      `not exists (${builder.getQuery()})`;
    return await this.todoRepository
      .createQueryBuilder('todos')
      .leftJoinAndSelect('todos.todoUsers', 'todo_users')
      .leftJoinAndSelect('todo_users.user', 'users')
      .where('todos.company_id = :companyId', { companyId })
      .andWhere('todos.is_closed =:closed', { closed: false })
      .andWhere(
        new Brackets((qb) => {
          qb.where('todos.deadline IS NULL').orWhere(
            notExistsQuery(
              AppDataSource.getRepository(TodoUser)
                .createQueryBuilder('todo_users')
                .where('todo_users.todo_id = todos.id')
                .andWhere('todo_users.user_id IS NOT NULL')
            )
          );
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
  };
}
