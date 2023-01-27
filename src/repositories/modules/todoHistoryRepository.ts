import { Service } from "typedi";
import { Repository } from "typeorm";

import Todo from "@/entities/Todo";
import TodoHistory from "@/entities/TodoHistory";

import AppDataSource from "@/config/data-source";
import logger from "@/logger/winston";
import { LoggerError } from "@/exceptions";
import { ITodo, ITodoHistory, IUser } from "@/types";
import { TodoHistoryProperty, TodoHistoryAction } from "@/consts/common";

import { diffDays, toJapanDateTime } from "@/utils/common";

@Service()
export default class TodoHistoryRepository {
  private todoHistoryRepository: Repository<TodoHistory>;
  private todoRepository: Repository<Todo>;

  constructor() {
    this.todoHistoryRepository = AppDataSource.getRepository(TodoHistory);
    this.todoRepository = AppDataSource.getRepository(Todo);
  }

  saveTodoHistories = async (todos: ITodoHistory[]): Promise<void> => {
    for (const todo of todos) {
      const todoOfDb: ITodo = await this.todoRepository.findOneBy({
        todoapp_reg_id: todo.todoId,
      });

      if (todoOfDb) {
        await this.saveTodoHistory(todoOfDb, todo);
      }
    }
  };

  saveTodoHistory = async (todoOfDb: ITodo, todo: ITodoHistory) => {
    const firstTodoHistory: TodoHistory = await this.todoHistoryRepository.findOneBy({
      todo_id: todoOfDb.id,
      property: TodoHistoryProperty.NAME,
      action: TodoHistoryAction.CREATE,
    });

    try {
      const todoUsers = todo.users || [];
      for (const user of todoUsers) {
        if (!firstTodoHistory) {
          await this.createTodoHistory(todoOfDb, TodoHistoryProperty.NAME, TodoHistoryAction.CREATE, todoOfDb.todoapp_reg_created_at);
          await this.createTodoHistory(todoOfDb, TodoHistoryProperty.ASSIGNEE, TodoHistoryAction.CREATE, todoOfDb.todoapp_reg_created_at, null, user);
          if (todo.deadline) {
            await this.createTodoHistory(todoOfDb, TodoHistoryProperty.DEADLINE, TodoHistoryAction.CREATE, todoOfDb.todoapp_reg_created_at, todo.deadline);
            if (todo.isDone) {
              await this.createTodoHistory(todoOfDb, TodoHistoryProperty.IS_DONE, TodoHistoryAction.CREATE, todo.deadline);
            }
          }
          if (todo.isClosed) {
            await this.createTodoHistory(todoOfDb, TodoHistoryProperty.IS_DONE, TodoHistoryAction.CREATE, todo.todoappRegUpdatedAt);
          }
        } else {
          const daysDiff = diffDays(toJapanDateTime(todoOfDb.deadline), toJapanDateTime(new Date()));
          if (daysDiff > 0 && !todo.isDone) {
            await this.createTodoHistory(todoOfDb, TodoHistoryProperty.IS_DELAYED, TodoHistoryAction.SYSTEM_CHANGE, todo.todoappRegUpdatedAt);
            if (todo.deadline != todoOfDb.deadline) {
              await this.createTodoHistory(todoOfDb, TodoHistoryProperty.IS_RECOVERED, TodoHistoryAction.SYSTEM_CHANGE, todo.todoappRegUpdatedAt);
            }
            if (todo.isDone != todoOfDb.is_done && todo.isDone === true) {
              await this.createTodoHistory(todoOfDb, TodoHistoryProperty.IS_RECOVERED, TodoHistoryAction.SYSTEM_CHANGE, todo.todoappRegUpdatedAt);
            }
          }

          if (todo.deadline != todoOfDb.deadline) {
            const daysDiff = diffDays(toJapanDateTime(todoOfDb.deadline), toJapanDateTime(todo.deadline));
            if (daysDiff != 0) {
              await this.createTodoHistory(todoOfDb, TodoHistoryProperty.DEADLINE, TodoHistoryAction.USER_CHANGE, todo.todoappRegUpdatedAt, todo.deadline, null, daysDiff);
            }
          }
          if (user.id != todoOfDb.user.id) {
            await this.createTodoHistory(todoOfDb, TodoHistoryProperty.ASSIGNEE, TodoHistoryAction.USER_CHANGE, todo.todoappRegUpdatedAt, null, user);
          }
          if (todo.isDone != todoOfDb.is_done) {
            await this.createTodoHistory(todoOfDb, TodoHistoryProperty.IS_DONE, TodoHistoryAction.USER_CHANGE, todo.todoappRegUpdatedAt);
          }
          if (todo.isClosed != todoOfDb.is_closed) {
            await this.createTodoHistory(todoOfDb, TodoHistoryProperty.IS_CLOSED, TodoHistoryAction.USER_CHANGE, todo.todoappRegUpdatedAt);
          }
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  createTodoHistory = async (
    todoOfDb: ITodo,
    property: number,
    action: number,
    updatedAt: Date,
    deadline?: Date,
    assignee?: IUser,
    daysDiff?: number) => {
    const todoHistory = new TodoHistory();

    todoHistory.todo_id = todoOfDb.id;
    todoHistory.property = property;
    todoHistory.action = action;
    todoHistory.todoapp_reg_updated_at = updatedAt;
    todoHistory.deadline = deadline;
    todoHistory.days_diff = daysDiff;

    if (assignee) {
      todoHistory.user_id = assignee.id;
    }

    await this.todoHistoryRepository.save(todoHistory);
  };
}
