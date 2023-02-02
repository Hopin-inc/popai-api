import { Brackets, IsNull, Not, Repository, SelectQueryBuilder } from "typeorm";
import { Service } from "typedi";

import ImplementedTodoApp from "@/entities/ImplementedTodoApp";
import ChatToolUser from "@/entities/ChatToolUser";
import Section from "@/entities/Section";
import SectionLabel from "@/entities/SectionLabel";
import Todo from "@/entities/Todo";
import TodoUser from "@/entities/TodoUser";
import User from "@/entities/User";
import CompanyCondition from "@/entities/CompanyCondition";

import AppDataSource from "@/config/data-source";
import logger from "@/logger/winston";
import { LoggerError } from "@/exceptions";

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

  public async getSections(companyId: number, todoappId: number): Promise<Section[]> {
    return await this.sectionRepository
      .createQueryBuilder("sections")
      .innerJoinAndSelect(
        "sections.boardAdminUser",
        "users",
        "sections.board_admin_user_id = users.id AND users.company_id = :companyId",
        { companyId }
      )
      .innerJoinAndSelect(
        "users.todoAppUsers",
        "todo_app_users",
        "users.id = todo_app_users.employee_id AND todo_app_users.todoapp_id = :todoappId",
        { todoappId }
      )
      .where("sections.company_id = :companyId", { companyId })
      .andWhere("sections.todoapp_id = :todoappId", { todoappId })
      .andWhere("sections.board_id IS NOT NULL")
      .getMany();
  }

  public async getSectionLabels(companyId: number, todoappId: number): Promise<SectionLabel[]> {
    return this.labelSectionRepository
      .createQueryBuilder("section_labels")
      .innerJoinAndSelect(
        "section_labels.section",
        "sections",
        "section_labels.section_id = sections.id"
      )
      .where("sections.company_id = :companyId", { companyId })
      .andWhere("sections.todoapp_id = :todoappId", { todoappId })
      .andWhere("section_labels.label_id IS NOT NULL")
      .getMany();
  }

  public async getBoardAdminUser(sectionId: number): Promise<User> {
    const section = await this.sectionRepository.findOne({
      where: { id: sectionId },
      relations: ["boardAdminUser", "boardAdminUser.todoAppUsers"]
    });
    return section.boardAdminUser;
  }

  public async getImplementTodoApp(companyId: number, todoappId: number): Promise<ImplementedTodoApp> {
    const implementTodoApp = await this.implementedTodoAppRepository.findOneBy({
      company_id: companyId,
      todoapp_id: todoappId,
    });

    if (!implementTodoApp) {
      logger.error(new LoggerError(
        `implemented_todo_appsのデータ(company_id=${ companyId }, todoapp_id=${ todoappId })がありません。`
      ));
    }
    return implementTodoApp;
  }

  public async getChatToolUsers(): Promise<ChatToolUser[]> {
    return await this.chatToolUserRepository.find();
  }

  public async getChatToolUser(userId: number, chatToolId: number): Promise<ChatToolUser> {
    const chatToolUser = await this.chatToolUserRepository.findOneBy({
      user_id: userId,
      chattool_id: chatToolId,
      auth_key: Not(IsNull()),
    });

    if (!chatToolUser) {
      logger.error(new LoggerError(
        `chat_tool_usersのデータ(user_id=${ userId }, chattool_id=${ chatToolId })がありません。`
      ));
    }
    return chatToolUser;
  }

  public async getChatToolUserByUserId(authKey: string): Promise<User[]> {
    return await this.userRepository
      .createQueryBuilder("users")
      .innerJoin("chat_tool_users", "r", "users.id = r.user_id")
      .innerJoinAndMapMany(
        "users.chattools",
        "m_chat_tools",
        "c",
        "c.id = r.chattool_id AND r.auth_key = :authKey",
        { authKey }
      )
      .getMany();
  }

  public async getDayReminds(companyConditions: CompanyCondition[]): Promise<number[]> {
    return companyConditions
      .map((s) => s.remind_before_days)
      .filter(Number.isFinite);
  }

  public async getNoDeadlineOrUnassignedTodos(companyId: number): Promise<Todo[]> {
    const notExistsQuery = <T>(builder: SelectQueryBuilder<T>) =>
      `not exists (${builder.getQuery()})`;
    return await this.todoRepository
      .createQueryBuilder("todos")
      .leftJoinAndSelect("todos.todoUsers", "todo_users")
      .leftJoinAndSelect("todo_users.user", "users")
      .leftJoinAndSelect("users.chattoolUsers", "chat_tool_users")
      .leftJoinAndSelect("chat_tool_users.chattool", "chat_tool")
      .where("todos.company_id = :companyId", { companyId })
      .andWhere("todos.is_closed =:closed", { closed: false })
      .andWhere("todos.is_done =:done", { done: false })
      .andWhere(
        new Brackets((qb) => {
          qb.where("todos.deadline IS NULL").orWhere(
            notExistsQuery(
              AppDataSource.getRepository(TodoUser)
                .createQueryBuilder("todo_users")
                .where("todo_users.todo_id = todos.id")
                .andWhere("todo_users.user_id IS NOT NULL")
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
  }
}
