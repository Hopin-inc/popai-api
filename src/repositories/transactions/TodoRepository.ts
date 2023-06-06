import dataSource from "@/config/data-source";
import Todo from "@/entities/transactions/Todo";
import Company from "@/entities/settings/Company";
import User from "@/entities/settings/User";
import { And, FindManyOptions, FindOptionsWhere, In, IsNull, LessThan, Not } from "typeorm";
import dayjs from "dayjs";
import { TodoAppId } from "@/consts/common";
import { ValueOf } from "@/types";

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
    return await this.find(<FindManyOptions<Todo>>{
      where: [
        { ...commonWhere, startDate: And(Not(IsNull()), LessThan(endDate)) },
        { ...commonWhere, startDate: IsNull(), deadline: LessThan(endDate) },
      ],
      order: { deadline: "asc" },
      relations: ["todoUsers.user.chatToolUser"],
    });
  },
  async getTodosByIds(
    ids: string[],
    relations: string[] = ["todoUsers.user", "prospects"],
  ): Promise<Todo[]> {
    return await this.find({ where: { id: In(ids) }, relations });
  },
  async findOneByAppTodoId(
    todoAppId: ValueOf<typeof TodoAppId>,
    appTodoId: string,
    companyId?: string,
  ): Promise<Todo> {
    return this.findOne({
      where: { appTodoId, todoAppId, companyId },
      relations: ["todoUsers", "todoProjects"],
    });
  },
  async findByAppIds(
    todoAppId: ValueOf<typeof TodoAppId>,
    appTodoIds: string[],
    companyId?: string,
  ) {
    return this.find({
      where: { todoAppId, appTodoId: In(appTodoIds), companyId },
      relations: ["todoUsers", "todoProjects"],
    });
  },
});
