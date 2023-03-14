import dataSource from "@/config/data-source";
import { TodoHistoryAction as Action, TodoHistoryProperty as Property } from "@/consts/common";
import Company from "@/entities/settings/Company";
import dayjs from "dayjs";
import TodoApp from "@/entities/masters/TodoApp";
import TodoHistory from "@/entities/transactions/TodoHistory";

export const TodoHistoryRepository = dataSource.getRepository(TodoHistory).extend({
  async getHistoriesCompletedYesterday(company: Company, yesterday: dayjs.Dayjs) {
    return this
      .createQueryBuilder("history")
      .innerJoinAndSelect("history.todo", "todo")
      .where("todo.company_id = :companyId", { companyId: company.id })
      .andWhere(
        "history.created_at BETWEEN :start AND :end",
        { start: yesterday.startOf("d").toDate(), end: yesterday.endOf("d").toDate() },
      )
      .andWhere("history.property = :property", { property: Property.IS_DONE })
      .andWhere("history.action = :action", { action: Action.CREATE })
      .getMany();
  },

  async getLastUpdatedDate(company: Company, todoapp: TodoApp): Promise<Date> {
    const companyId = company.id;
    const todoAppId = todoapp.id;

    const lastUpdatedRecord = await this
      .createQueryBuilder("todo_histories")
      .leftJoinAndSelect(
        "todo_histories.todo",
        "todos",
        "todo_histories.todo_id = todos.id")
      .where("todos.company_id = :companyId", { companyId: companyId })
      .andWhere("todos.todoapp_id = :todoappId", { todoappId: todoAppId })
      .orderBy("todo_histories.todoapp_reg_updated_at", "DESC")
      .getOne();

    return lastUpdatedRecord?.todoapp_reg_updated_at;
  },
});