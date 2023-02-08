import { Between, Brackets, In, IsNull, LessThan, Not, Repository, SelectQueryBuilder } from "typeorm";
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
import Company from "@/entities/Company";
import { IDailyReportItems } from "@/types";
import TodoHistory from "@/entities/TodoHistory";
import dayjs from "dayjs";
import { TodoHistoryProperty as Property, TodoHistoryAction as Action } from "@/consts/common";

@Service()
export default class CommonRepository {
  private sectionRepository: Repository<Section>;
  private labelSectionRepository: Repository<SectionLabel>;
  private userRepository: Repository<User>;
  private implementedTodoAppRepository: Repository<ImplementedTodoApp>;
  private chatToolUserRepository: Repository<ChatToolUser>;
  private todoRepository: Repository<Todo>;
  private todoHistoryRepository: Repository<TodoHistory>;

  constructor() {
    this.sectionRepository = AppDataSource.getRepository(Section);
    this.labelSectionRepository = AppDataSource.getRepository(SectionLabel);
    this.userRepository = AppDataSource.getRepository(User);
    this.implementedTodoAppRepository = AppDataSource.getRepository(ImplementedTodoApp);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.chatToolUserRepository = AppDataSource.getRepository(ChatToolUser);
    this.todoHistoryRepository = AppDataSource.getRepository(TodoHistory);
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

  public async getDailyReportItems(company: Company): Promise<IDailyReportItems> {
    const [completedYesterday, delayed, ongoing] = await Promise.all([
      this.getTodosCompletedYesterday(company),
      this.getTodosDelayed(company),
      this.getTodosOngoing(company),
    ]);
    return { completedYesterday, delayed, ongoing };
  }

  private async getTodosCompletedYesterday(company: Company): Promise<Todo[]> {
    const yesterday = dayjs().subtract(1, "d");
    const targetHistories = await this.todoHistoryRepository.createQueryBuilder("history")
      .innerJoinAndSelect("history.todo", "todo")
      .where("todo.company_id = :companyId", { companyId: company.id })
      .andWhere(
        "history.created_at BETWEEN :start AND :end",
        { start: yesterday.startOf("d").toDate(), end: yesterday.endOf("d").toDate() }
      )
      .andWhere("history.property = :property", { property: Property.IS_DONE })
      .andWhere("history.action = :action", { action: Action.CREATE })
      .getMany();
    const targetTodoIds = targetHistories.map(history => history.todo_id);
    const todos = await this.todoRepository.find({
      where: { id: In(targetTodoIds) },
      relations: ["histories", "todoUsers.user"],
    });
    return todos.filter(todo => {
      if (todo.histories) {
        const histories = todo.histories
          .filter(h => h.property === Property.IS_DONE)
          .sort((a, b) => a.created_at > b.created_at ? 1 : -1);
        return histories && histories.length && histories.pop().action === Action.CREATE;
      } else {
        return false;
      }
    });
  }

  private async getTodosDelayed(company: Company): Promise<Todo[]> {
    const startOfToday = dayjs().startOf("d").toDate();
    return await this.todoRepository.find({
      where: {
        company_id: company.id,
        deadline: LessThan(startOfToday),
        is_closed: false,
        is_done: false,
      },
      relations: ["todoUsers.user"],
    });
  }

  private async getTodosOngoing(company: Company): Promise<Todo[]> {
    const startOfToday = dayjs().startOf("d").toDate();
    const endOfToday = dayjs().endOf("d").toDate();
    return await this.todoRepository.find({
      where: {
        company_id: company.id,
        deadline: Between(startOfToday, endOfToday),
        is_closed: false,
        is_done: false,
      },
      relations: ["todoUsers.user"],
    });
  }
}
