import { ITodo, ITodoUpdate } from "../../types";
import { Service } from "typedi";
import { Repository } from "typeorm";
import { AppDataSource } from "../../config/dataSource";
import logger from "../../logger/winston";
import { LoggerError } from "../../exceptions";
import { TodoUpdateHistory } from "../../entify/todoUpdateHistory.entity";
import { Todo } from "../../entify/todo.entity";

@Service()
export default class TodoUpdateRepository {
  private todoUpdateRepository: Repository<TodoUpdateHistory>;
  private todoRepository: Repository<Todo>;

  constructor() {
    this.todoUpdateRepository = AppDataSource.getRepository(TodoUpdateHistory);
    this.todoRepository = AppDataSource.getRepository(Todo);
  }

  saveTodoHistories = async (dataTodoIDUpdates: ITodoUpdate[]): Promise<void> => {
    if (dataTodoIDUpdates.length) {
      for (const dataUpdate of dataTodoIDUpdates) {
        const { todoId } = dataUpdate;

        const todo: ITodo = await this.todoRepository.findOneBy({
          todoapp_reg_id: todoId,
        });

        if (todo) {
          await this.saveTodoHistory(todo, dataUpdate);
        }
      }
    }
  };

  saveTodoHistory = async (todo: ITodo, dataUpdate: ITodoUpdate) => {
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
