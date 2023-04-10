import dataSource from "@/config/data-source";
import { IPerformanceReportItems } from "@/types";
import Todo from "@/entities/transactions/Todo";
import {
  MAX_REMIND_COUNT,
  NOT_UPDATED_DAYS, TodoAppCode,
  TodoHistoryAction as Action,
  TodoHistoryProperty as Property,
} from "@/consts/common";
import Company from "@/entities/settings/Company";
import User from "@/entities/settings/User";
import { Between, Brackets, FindOptionsWhere, In, LessThan, SelectQueryBuilder } from "typeorm";
import dayjs from "dayjs";
import { TodoHistoryRepository } from "@/repositories/transactions/TodoHistoryRepository";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import logger from "@/logger/winston";
import { ValueOf } from "@/types";
import { TodoUserRepository } from "@/repositories/transactions/TodoUserRepository";
import NotionService from "@/services/NotionService";

export const TodoRepository = dataSource.getRepository<Todo>(Todo).extend({
  async getTodoHistories(todoIds: string[]): Promise<Todo[]> {
    try {
      return await this.createQueryBuilder("todos")
        .leftJoinAndSelect("todos.todoUsers", "todo_users")
        .leftJoinAndSelect("todo_users.user", "users")
        .leftJoinAndSelect("users.chattoolUsers", "chat_tool_users")
        .leftJoinAndSelect("todos.todoSections", "todo_sections")
        .leftJoinAndSelect("todo_sections.section", "sections")
        .leftJoinAndSelect("todos.todoapp", "todoapp")
        .leftJoinAndSelect("todos.company", "company")
        .leftJoinAndSelect("company.implementedChatTools", "implemented_chat_tools")
        .leftJoinAndSelect("implemented_chat_tools.chattool", "chat_tools")
        .where("todos.todoapp_reg_id IN (:...todoIds)", { todoIds })
        .getMany();
    } catch (error) {
      logger.error(error);
    }
  },

  async getLastWeekTodosByStatus(company: Company): Promise<IPerformanceReportItems> {
    const lastWeek = dayjs().subtract(1, "w");
    const [statusChangedHistories, planedHistories] = await Promise.all([
      TodoHistoryRepository.getHistoriesLastWeek(company, lastWeek),
      TodoHistoryRepository.getHistoriesPlanedLastWeek(company, lastWeek),
    ]);

    const statusChangedTodoIds = statusChangedHistories.map(history => history.todo_id);
    const planedTodoIds = planedHistories.map(history => history.todo_id);

    const [statusChangedTodos, planedTodos] = await Promise.all([
      this.find({
        where: { id: In(statusChangedTodoIds) },
        relations: ["histories", "todoUsers.user", "todoSections.section", "todoapp"],
      }),
      this.find({
        where: { id: In(planedTodoIds) },
        relations: ["histories", "todoUsers.user", "todoSections.section", "todoapp"],
      }),
    ]);

    const [planed, completed, delayed, closed] = await Promise.all([
      this.filterTodosByProperty(planedTodos, Property.DEADLINE),
      this.filterTodosByProperty(statusChangedTodos, Property.IS_DONE),
      this.filterTodosByProperty(statusChangedTodos, Property.IS_DELAYED),
      this.filterTodosByProperty(statusChangedTodos, Property.IS_CLOSED),
    ]);
    return { planed, completed, delayed, closed };
  },

  async filterTodosByProperty(
    todos: Todo[],
    property: ValueOf<typeof Property>,
  ): Promise<Todo[]> {
    return todos.filter(todo => {
      if (todo.histories) {
        const histories = todo.histories
          .filter(h => h.property === property)
          .sort((a, b) => a.todoapp_reg_updated_at > b.todoapp_reg_updated_at ? 1 : -1);
        return histories && histories.length && histories.slice(-1)[0].action === Action.CREATE;
      }
      return false;
    });
  },

  async getTodosCompletedYesterday(company: Company): Promise<Todo[]> {
    const yesterday = dayjs().subtract(1, "d");
    const targetHistories = await TodoHistoryRepository.getHistoriesCompletedYesterday(company, yesterday);
    const targetTodoIds = targetHistories.map(history => history.todo_id);
    const todos = await this.find({
      where: { id: In(targetTodoIds) },
      relations: ["histories", "todoUsers.user", "todoSections.section", "todoapp"],
    });
    return todos.filter(todo => {
      if (todo.histories) {
        const histories = todo.histories
          .filter(h => h.property === Property.IS_DONE)
          .sort((a, b) => a.created_at > b.created_at ? 1 : -1);
        return histories && histories.length && histories.slice(-1)[0].action === Action.CREATE;
      } else {
        return false;
      }
    });
  },

  async getTodosDelayed(company: Company, notionClient: NotionService): Promise<Todo[]> {
    const startOfToday = dayjs().startOf("d").toDate();
    const delayedTodos = await this.find({
      where: {
        company_id: company.id,
        deadline: LessThan(startOfToday),
        is_closed: false,
        is_done: false,
      },
      relations: ["todoUsers.user", "todoSections.section", "todoapp"],
    });
    return Promise.all(delayedTodos.map((todo) => this.getNotArchivedTodoInNotion(todo, notionClient)));
  },

  async getTodosOngoing(company: Company, notionClient: NotionService): Promise<Todo[]> {
    const startOfToday = dayjs().startOf("d").toDate();
    const endOfToday = dayjs().endOf("d").toDate();
    const onGoingTodos = await this.find({
      where: {
        company_id: company.id,
        deadline: Between(startOfToday, endOfToday),
        is_closed: false,
        is_done: false,
      },
      relations: ["todoUsers.user", "todoSections.section", "todoapp"],
    });
    return Promise.all(onGoingTodos.map(todo => this.getNotArchivedTodoInNotion(todo, notionClient)));
  },

  async getNotUpdatedTodos(company: Company): Promise<Todo[]> {
    const thresholdDate = dayjs().subtract(NOT_UPDATED_DAYS, "d").startOf("d").toDate();
    return await this.find({
      where: {
        company_id: company.id,
        updated_at: LessThan(thresholdDate),
        is_done: false,
        is_closed: false,
      },
      relations: ["todoUsers.user", "todoSections.section"],
    });
  },

  async getActiveTodos(company: Company, user?: User): Promise<Todo[]> {
    const filterByUser: FindOptionsWhere<Todo> = user ? { todoUsers: { user_id: user.id } } : {};
    const startDate = dayjs().startOf("day").toDate();
    const endDate = dayjs().endOf("day").toDate();
    return await this.find({
      where: {
        company_id: company.id,
        deadline: Between(startDate, endDate),
        is_done: false,
        is_closed: false,
        ...filterByUser,
      },
      relations: ["todoUsers.user.chattoolUsers.chattool", "todoSections.section"],
    });
  },

  async getNotArchivedTodoInNotion(todo: Todo, notionClient: NotionService): Promise<Todo> {
    if (todo.todoapp.todo_app_code === TodoAppCode.NOTION) {
      const pageResponse = await notionClient.retrievePage({ page_id: todo.todoapp_reg_id });
      if ("object" in pageResponse && "properties" in pageResponse) {
        const pageObjectResponse: PageObjectResponse = pageResponse;
        if (pageObjectResponse.archived === true) {
          const deletedPageRecord = await this.find({ where: { todoapp_reg_id: todo.todoapp_reg_id } });
          await this.softRemove(deletedPageRecord);
        } else {
          return todo;
        }
      }
    } else {
      return todo;
    }
  },

  async getTodosByIds(
    ids: number[],
    relations: string[] = ["todoUsers.user", "todoSections.section", "prospects"],
  ): Promise<Todo[]> {
    return await this.find({ where: { id: In(ids) }, relations });
  },

  async getRemindTodos(
    company: Company,
    minDate: Date,
    maxDate: Date,
    user?: User,
  ): Promise<Todo[]> {
    return await this
      .createQueryBuilder("todos")
      .leftJoinAndSelect("todos.todoUsers", "todo_users")
      .leftJoinAndSelect("todo_users.user", "users")
      .where("todos.is_done = :done", { done: false })
      .andWhere("todos.is_closed = :closed", { closed: false })
      .andWhere("todos.company_id = :company_id", { company_id: company.id })
      .andWhere("todos.reminded_count < :reminded_count", { reminded_count: MAX_REMIND_COUNT })
      .andWhere("todos.deadline >= :min_date", { min_date: minDate })
      .andWhere("todos.deadline <= :max_date", { max_date: maxDate })
      .andWhere("todo_users.deleted_at IS NULL")
      .andWhere(user ? "todo_users.user_id = :user_id" : "1=1", { user_id: user?.id })
      .getMany();
  },

  async getNoDeadlineOrUnassignedTodos(companyId: number): Promise<Todo[]> {
    const notExistsQuery = <T>(builder: SelectQueryBuilder<T>) =>
      `not exists (${ builder.getQuery() })`;
    return await this
      .createQueryBuilder("todos")
      .leftJoinAndSelect("todos.todoUsers", "todo_users")
      .leftJoinAndSelect("todo_users.user", "users")
      .leftJoinAndSelect("users.chattoolUsers", "chat_tool_users")
      .leftJoinAndSelect("chat_tool_users.chattool", "chat_tool")
      .where("todos.company_id = :companyId", { companyId })
      .andWhere("todos.is_closed =:isClosed", { isClosed: false })
      .andWhere("todos.is_done =:isDone", { isDone: false })
      .andWhere(
        new Brackets((qb) => {
          qb.where("todos.deadline IS NULL").orWhere(
            notExistsQuery(
              TodoUserRepository
                .createQueryBuilder("todo_users")
                .where("todo_users.todo_id = todos.id")
                .andWhere("todo_users.user_id IS NOT NULL"),
            ),
          );
        }),
      )
      .getMany();
  },
});
