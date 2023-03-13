import dataSource from "@/config/data-source";
import Todo from "@/entities/transactions/Todo";
import { MAX_REMIND_COUNT } from "@/consts/common";
import Company from "@/entities/settings/Company";
import User from "@/entities/settings/User";
import { Brackets, SelectQueryBuilder } from "typeorm";
import AppDataSource from "@/config/data-source";
import TodoUser from "@/entities/transactions/TodoUser";

export const TodoRepository = dataSource.getRepository(Todo).extend({
  async getTodoHistories(todoIds: string[]): Promise<Todo[]> {
    return this.createQueryBuilder("todos")
      .leftJoinAndSelect("todos.todoUsers", "todo_users")
      .leftJoinAndSelect("todo_users.user", "users")
      .leftJoinAndSelect("users.chattoolUsers", "chat_tool_users")
      .leftJoinAndSelect("todos.todoSections", "todo_sections")
      .leftJoinAndSelect("todo_sections.section", "sections")
      .leftJoinAndSelect("todos.company", "company")
      .leftJoinAndSelect("company.implementedChatTools", "implemented_chat_tools")
      .leftJoinAndSelect("implemented_chat_tools.chattool", "chat_tool")
      .where("todos.todoapp_reg_id IN (:...todoIds)", { todoIds })
      .getMany();
  },
  async getRemindTodos(
    company: Company,
    minDate: Date,
    maxDate: Date,
    user?: User,
  ): Promise<Todo[]> {
    return this
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
      `not exists (${builder.getQuery()})`;
    return this
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
              AppDataSource.getRepository(TodoUser)
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