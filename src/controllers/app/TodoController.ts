import { Controller } from "tsoa";
import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import Todo from "@/entities/transactions/Todo";
import { PaginateResponse } from "@/types/pagination";
import { TodoFilter } from "@/types/todos";


export default class TodoController extends Controller {
  public async get(companyId: string, todoAppId: number, params: TodoFilter): Promise<PaginateResponse<Todo[]>> {
    return await TodoRepository.getListTodos(companyId, todoAppId, params);
  }
}
