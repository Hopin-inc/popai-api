import dataSource from "@/config/data-source";
import Todo from "@/entities/transactions/Todo";
import Company from "@/entities/settings/Company";
import User from "@/entities/settings/User";
import { And, FindManyOptions, FindOptionsWhere, In, IsNull, LessThan, Not, SelectQueryBuilder } from "typeorm";
import dayjs from "dayjs";
import { TodoAppId, TodoStatus } from "@/consts/common";
import { ValueOf } from "@/types";
import { PaginateResponse } from "@/types/pagination";
import { TodoFilter } from "@/types/todos";

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
  async getRemindTodos(
    companyId: string,
    delayed: boolean,
    limit?: number,
  ): Promise<Todo[]> {
    const today = dayjs().startOf("day").toDate();
    const delayedFilter: FindOptionsWhere<Todo> = delayed ? {
      deadline: LessThan(today),
      isDone: false,
      isClosed: false,
    } : {};
    const todos: Todo[] = await this.find(<FindManyOptions<Todo>>{
      where: { companyId, ...delayedFilter },
      order: { deadline: "asc" },
      relations: ["todoUsers.user.chatToolUser", "reminds"],
    });
    return todos.filter(todo => !limit || todo.reminds?.length <= limit);
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
      relations: ["todoUsers.user", "todoProjects.project", "reminds"],
    });
  },
  async findByAppIds(
    todoAppId: ValueOf<typeof TodoAppId>,
    appTodoIds: string[],
    companyId?: string,
  ) {
    return this.find({
      where: { todoAppId, appTodoId: In(appTodoIds), companyId },
      relations: ["todoUsers", "todoProjects", "reminds"],
    });
  },
  async getListTodos(
    companyId: string,
    todoAppId: number,
    params?: TodoFilter,
  ): Promise<PaginateResponse<Todo[]>> {
    const {
      perPage = 10,
      page = 1,
      assignee = null,
      status = null,
      startDate = null,
      endDate = null,
    } = params || {};
  
    const skip: number = (perPage * page) - perPage;
  
    const queryBuilder = this.createQueryBuilder("t_todos")
      .leftJoinAndSelect("t_todos.todoUsers", "todoUsers")
      .leftJoinAndSelect("todoUsers.user", "user")
      .where("t_todos.companyId = :companyId", { companyId })
      .andWhere("t_todos.todoAppId = :todoAppId", { todoAppId });
  
    if (status) {
      switch(status) {
        case TodoStatus.DONE:
          queryBuilder.andWhere("t_todos.isDone = true");
          break;
        case TodoStatus.CLOSED:
          queryBuilder.andWhere("t_todos.isDone = false")
                      .andWhere("t_todos.isClosed = true");
          break;
        case TodoStatus.INCOMPLETE:
          queryBuilder.andWhere("t_todos.isDone = false")
                      .andWhere("t_todos.isClosed = false");
          break;
      }
    }
  
    if (startDate) {
      queryBuilder.andWhere("t_todos.startDate >= :startDate", { startDate });
    }
  
    if (endDate) {
      queryBuilder.andWhere("t_todos.deadline <= :endDate", { endDate });
    }
  
    if (assignee) {
      queryBuilder.andWhere((qb: SelectQueryBuilder<Todo>) => {
        const subQuery = qb.subQuery()
          .select("1")
          .from("t_todo_users", "todoUsers")
          .where("todoUsers.todoId = t_todos.id")
          .andWhere("todoUsers.user_id = :assignee")
          .getQuery();
        return `EXISTS (${ subQuery })`;
      }, { assignee });
    }
  
    if (perPage > 0) {
      queryBuilder.skip(skip).take(perPage);
    }
  
    const [items, total] = await queryBuilder.getManyAndCount();
  
    const results: PaginateResponse<Todo[]> = {
      items: items,
      meta: {
        page: page,
        perPage: perPage,
        totalCount: total,
        pageCount: Math.ceil(total / perPage),
      },
    };
  
    return results;
  },
});
