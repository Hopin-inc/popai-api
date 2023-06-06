import dataSource from "@/config/data-source";
import { TodoHistoryProperty as Property } from "@/consts/common";
import Company from "@/entities/settings/Company";
import TodoHistory from "@/entities/transactions/TodoHistory";
import { ITodoHistoryOption } from "@/types";
import { FindOptionsOrder, FindOptionsWhere } from "typeorm";
import Todo from "@/entities/transactions/Todo";

export const TodoHistoryRepository = dataSource.getRepository(TodoHistory).extend({
  async saveHistories(options: ITodoHistoryOption[]): Promise<void> {
    const histories = options.map(history => {
      const { id, property, action, info } = history;
      return new TodoHistory({
        todo: id,
        property,
        action,
        appUpdatedAt: new Date(),
        ...info,
      });
    });
    await this.save(histories);
  },
  async getLatestDelayedHistory(todo: Todo): Promise<TodoHistory | null> {
    const where: FindOptionsWhere<TodoHistory> = {
      todoId: todo.id,
      property: Property.IS_DELAYED,
    };
    const order: FindOptionsOrder<TodoHistory> = {
      createdAt: "DESC",
    };
    return this.findOne({ where, order });
  },
  async getLatestRecoveredHistory(todo: Todo): Promise<TodoHistory | null> {
    const where: FindOptionsWhere<TodoHistory> = {
      todoId: todo.id,
      property: Property.IS_RECOVERED,
    };
    const order: FindOptionsOrder<TodoHistory> = {
      createdAt: "DESC",
    };
    return this.findOne({ where, order });
  },
  async getLastUpdatedDate(company: Company, todoAppId: number): Promise<Date | null> {
    const companyId = company.id;
    const where: FindOptionsWhere<TodoHistory> = { todo: { companyId, todoAppId } };
    const order: FindOptionsOrder<TodoHistory> = { appUpdatedAt: "DESC" };
    const history: TodoHistory = await this.findOne({ where, order, relations: ["todo"] });
    return history?.appUpdatedAt ?? null;
  },
});
