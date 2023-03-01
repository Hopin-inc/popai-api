import { Service } from "typedi";
import { Repository } from "typeorm";

import Todo from "@/entities/transactions/Todo";
import TodoUpdateHistory from "@/entities/transactions/TodoUpdateHistory";

import AppDataSource from "@/config/data-source";
import logger from "@/logger/winston";
import { LoggerError } from "@/exceptions";
import { ITodoUpdate } from "@/types";

@Service()
export default class TodoUpdateHistoryRepository {
  private todoUpdateRepository: Repository<TodoUpdateHistory>;
  private todoRepository: Repository<Todo>;

  constructor() {
    this.todoUpdateRepository = AppDataSource.getRepository(TodoUpdateHistory);
    this.todoRepository = AppDataSource.getRepository(Todo);
  }

  public async saveTodoUpdateHistories(dataTodoIDUpdates: ITodoUpdate[]): Promise<void> {
    if (dataTodoIDUpdates.length) {
      for (const dataUpdate of dataTodoIDUpdates) {
        const { todoId } = dataUpdate;

        const todo: Todo = await this.todoRepository.findOneBy({
          todoapp_reg_id: todoId,
        });

        if (todo) {
          await this.saveTodoUpdateHistory(todo, dataUpdate);
        }
      }
    }
  }

  public async saveTodoUpdateHistory(todo: Todo, dataUpdate: ITodoUpdate) {
    try {
      const { dueTime, newDueTime, updateTime } = dataUpdate;

      const todoUpdate = new TodoUpdateHistory();
      todoUpdate.todo_id = todo.id;
      todoUpdate.deadline_before = dueTime || newDueTime;
      todoUpdate.deadline_after = newDueTime;
      todoUpdate.is_done = todo.is_done ?? null;
      todoUpdate.todoapp_reg_updated_at = updateTime;

      await this.todoUpdateRepository.save(todoUpdate);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }
}
