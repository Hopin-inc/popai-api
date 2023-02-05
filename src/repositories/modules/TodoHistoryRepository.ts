import { Container, Service } from "typedi";
import { Repository } from "typeorm";

import Todo from "@/entities/Todo";
import TodoHistory from "@/entities/TodoHistory";
import User from "@/entities/User";
import ChatTool from "@/entities/ChatTool";

import AppDataSource from "@/config/data-source";
import logger from "@/logger/winston";
import { LoggerError } from "@/exceptions";
import { ITodoHistory, valueOf } from "@/types";
import { TodoHistoryProperty as Property, TodoHistoryAction as Action, ChatToolCode } from "@/consts/common";

import { diffDays, toJapanDateTime } from "@/utils/common";
import SlackRepository from "@/repositories/SlackRepository";

@Service()
export default class TodoHistoryRepository {
  private todoHistoryRepository: Repository<TodoHistory>;
  private todoRepository: Repository<Todo>;
  private slackRepository: SlackRepository;

  constructor() {
    this.todoHistoryRepository = AppDataSource.getRepository(TodoHistory);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.slackRepository = Container.get(SlackRepository);
  }

  public async saveTodoHistories(todos: ITodoHistory[], notify: boolean = false): Promise<void> {
    await Promise.all(todos.map(async todo => {
      const savedTodo: Todo = await this.todoRepository.findOne({
        where: { todoapp_reg_id: todo.todoId },
        relations: ["todoUsers.user.chattoolUsers", "company.implementedChatTools.chattool"],
      });
      if (savedTodo.id) {
        await this.saveTodoHistory(savedTodo, todo, notify);
      }
    }));
  }

  private async saveTodoHistory(savedTodo: Todo, history: ITodoHistory, notify: boolean = false) {
    try {
      const firstTodoHistory: TodoHistory = await this.todoHistoryRepository.findOneBy({
        todo_id: savedTodo.id,
        property: Property.NAME,
        action: Action.CREATE,
      });
      const currentTodoStatus: TodoHistory = await this.todoHistoryRepository.findOne({
        where: { todo_id: savedTodo.id },
        order: { created_at: "DESC" },
      });
      const { deadline, isDone, isClosed } = history;
      const createdAt = savedTodo.todoapp_reg_created_at;
      const assignees = history.users || [];
      const argsList: Parameters<typeof this.saveTodo>[] = [];
      if (!firstTodoHistory) {  // 初回登録時
        argsList.push([savedTodo, Property.NAME, Action.CREATE, createdAt, null, notify]);
        assignees.forEach(assignee => {
          argsList.push([savedTodo, Property.ASSIGNEE, Action.CREATE, createdAt, { assignee }, notify]);
        });
        if (deadline) {
          argsList.push([savedTodo, Property.DEADLINE, Action.CREATE, createdAt, { deadline }, notify]);
        }
        if (isDone) {
          argsList.push([savedTodo, Property.IS_DONE, Action.CREATE, createdAt, null, notify]);
        }
        if (isClosed) {
          argsList.push([savedTodo, Property.IS_CLOSED, Action.CREATE, createdAt, null, notify]);
        }
      } else {
        const daysDiff = diffDays(toJapanDateTime(savedTodo.deadline), toJapanDateTime(new Date()));
        if (daysDiff > 0) {
          if (!isDone && currentTodoStatus.property !== Property.IS_DELAYED) {
            argsList.push([savedTodo, Property.IS_DELAYED, Action.SYSTEM_CHANGE, createdAt, null, notify]);
          }
          if (savedTodo.deadline !== deadline && currentTodoStatus.property !== Property.IS_RECOVERED) {
            argsList.push([savedTodo, Property.IS_RECOVERED, Action.SYSTEM_CHANGE, createdAt, null, notify]);
          }
          if (savedTodo.is_done && isDone && currentTodoStatus.property !== Property.IS_RECOVERED) {
            argsList.push([savedTodo, Property.IS_RECOVERED, Action.SYSTEM_CHANGE, createdAt, null, notify]);
          }
        }

        if (savedTodo.deadline !== deadline) {
          const daysDiff = diffDays(toJapanDateTime(savedTodo.deadline), toJapanDateTime(history.deadline));
          if (daysDiff !== 0) {
            argsList.push([savedTodo, Property.DEADLINE, Action.USER_CHANGE, createdAt, { deadline, daysDiff }, notify]);
          }
        }
        if (savedTodo.is_done !== isDone) {
          argsList.push([savedTodo, Property.IS_DONE, Action.USER_CHANGE, createdAt, null, notify]);
        }
        if (savedTodo.is_closed !== isClosed) {
          argsList.push([savedTodo, Property.IS_CLOSED, Action.USER_CHANGE, createdAt, null, notify]);
        }

        assignees.forEach(assignee => {
          const isSameUser = savedTodo.todoUsers.map(todoUser => todoUser.user_id).includes(assignee.id);
          if (!isSameUser) {
            argsList.push([savedTodo, Property.ASSIGNEE, Action.USER_CHANGE, createdAt, { assignee }, notify]);
          }
        });
      }
      await Promise.all(argsList.map(args => this.saveTodo(...args)));
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  public async saveTodo(
    savedTodo: Todo,
    property: valueOf<typeof Property>,
    action: valueOf<typeof Action>,
    updatedAt: Date,
    info: { deadline?: Date, assignee?: User, daysDiff?: number } | null,
    notify?: boolean
  ) {
    const todoHistory = new TodoHistory();
    todoHistory.todo_id = savedTodo.id;
    todoHistory.property = property;
    todoHistory.action = action;
    todoHistory.todoapp_reg_updated_at = updatedAt;
    todoHistory.deadline = info?.deadline;
    todoHistory.days_diff = info?.daysDiff;

    if (info?.assignee) {
      todoHistory.user_id = info?.assignee.id;
    }

    await this.todoHistoryRepository.save(todoHistory);

    if (notify) {
      await Promise.all(savedTodo.company?.chatTools?.map(
        chatTool => this.notifyOnUpdate(savedTodo, property, action, chatTool)
      ));
    }
  }

  private async notifyOnUpdate(
    todo: Todo,
    property: valueOf<typeof Property>,
    action: valueOf<typeof Action>,
    chatTool: ChatTool
  ) {
    const code = chatTool.tool_code;
    if (property === Property.IS_DONE && action === Action.CREATE) {  // 完了
      switch (code) {
        case ChatToolCode.LINE:
          break;
        case ChatToolCode.SLACK:
          await this.slackRepository.notifyOnCompleted(todo, chatTool);
          break;
      }
    } else if (property === Property.ASSIGNEE) {  // 担当者
      switch (code) {
        case ChatToolCode.LINE:
          break;
        case ChatToolCode.SLACK:
          await this.slackRepository.notifyOnAssigneeUpdated(todo, action, chatTool);
          break;
      }
    } else if (property === Property.DEADLINE) {  // 期日
      switch (code) {
        case ChatToolCode.LINE:
          break;
        case ChatToolCode.SLACK:
          await this.slackRepository.notifyOnDeadlineUpdated(todo, action, chatTool);
          break;
      }
    }
  }
}
