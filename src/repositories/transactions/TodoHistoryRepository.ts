import dataSource from "@/config/data-source";
import { TodoAppId } from "@/consts/common";
import Company from "@/entities/settings/Company";
import TodoHistory from "@/entities/transactions/TodoHistory";
import { ValueOf } from "@/types";
import { FindOptionsOrder, FindOptionsWhere } from "typeorm";

export const TodoHistoryRepository = dataSource.getRepository(TodoHistory).extend({
  async getLastUpdatedDate(company: Company, todoAppId: ValueOf<typeof TodoAppId>): Promise<Date | null> {
    const companyId = company.id;
    const where: FindOptionsWhere<TodoHistory> = { todo: { companyId, todoAppId } };
    const order: FindOptionsOrder<TodoHistory> = { appUpdatedAt: "DESC" };
    const history: TodoHistory = await this.findOne({ where, order, relations: ["todo"] });
    return history?.appUpdatedAt ?? null;
  },
});
