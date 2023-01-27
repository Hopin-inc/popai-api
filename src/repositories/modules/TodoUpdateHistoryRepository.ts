import { Service } from "typedi";
import { Repository } from "typeorm";

import Todo from "@/entities/Todo";
import TodoUpdateHistory from "@/entities/TodoUpdateHistory";

import AppDataSource from "@/config/data-source";
import logger from "@/logger/winston";
import { LoggerError } from "@/exceptions";
import { ITodo, ITodoUpdate } from "@/types";

@Service()
export default class TodoUpdateHistoryRepository {
  private todoUpdateRepository: Repository<TodoUpdateHistory>;
  private todoRepository: Repository<Todo>;

  constructor() {
    this.todoUpdateRepository = AppDataSource.getRepository(TodoUpdateHistory);
    this.todoRepository = AppDataSource.getRepository(Todo);
  }

  saveTodoUpdateHistories = async (dataTodoIDUpdates: ITodoUpdate[]): Promise<void> => {
    if (dataTodoIDUpdates.length) {
      for (const dataUpdate of dataTodoIDUpdates) {
        const { todoId } = dataUpdate;

        const todo: ITodo = await this.todoRepository.findOneBy({
          todoapp_reg_id: todoId,
        });

        if (todo) {
          await this.saveTodoUpdateHistory(todo, dataUpdate);
        }
      }
    }
  };

  saveTodoUpdateHistory = async (todo: ITodo, dataUpdate: ITodoUpdate) => {
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
  };
}
