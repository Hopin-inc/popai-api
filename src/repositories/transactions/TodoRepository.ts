import dataSource from "@/config/data-source";
import Todo from "@/entities/transactions/Todo";
import Company from "@/entities/settings/Company";
import User from "@/entities/settings/User";
import { And, FindOptionsWhere, In, IsNull, LessThan, Not } from "typeorm";
import dayjs from "dayjs";

export const TodoRepository = dataSource.getRepository(Todo).extend({
  async getTodos(todoIds: string[], companyId: string): Promise<Todo[]> {
    const where: FindOptionsWhere<Todo> = { appTodoId: In(todoIds), companyId };
    return this.find({ where, relations: ["todoUsers.user.chatToolUser", "company.implementedChatTool"] });
  },
  async getActiveTodos(company: Company, user?: User): Promise<Todo[]> {
    const filterByUser: FindOptionsWhere<Todo> = user ? { todoUsers: { userId: user.id } } : {};
    const commonWhere: FindOptionsWhere<Todo> = {
      companyId: company.id,
      isDone: false,
      isClosed: false,
      ...filterByUser,
    };
    const endDate = dayjs().endOf("day").toDate();
    return await this.find({
      where: [
        { ...commonWhere, startDate: And(Not(IsNull()), LessThan(endDate)) },
        { ...commonWhere, startDate: IsNull(), deadline: LessThan(endDate) },
      ],
      relations: ["todoUsers.user.chatToolUser"],
    });
  },
  async getTodosByIds(
    ids: number[],
    relations: string[] = ["todoUsers.user", "prospects"],
  ): Promise<Todo[]> {
    return await this.find({ where: { id: In(ids) }, relations });
  },
});
