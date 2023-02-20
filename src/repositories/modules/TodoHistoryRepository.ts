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

import { diffDays, extractDifferences, toJapanDateTime } from "@/utils/common";
import SlackRepository from "@/repositories/SlackRepository";

type Info = { deadline?: Date, assignee?: User, daysDiff?: number };

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

  public async saveTodoHistories(savedTodos: Todo[], todos: ITodoHistory[], notify: boolean = false): Promise<void> {
    await Promise.all(todos.map(async todo => {
      const savedTodo = savedTodos.find(t => t.todoapp_reg_id === todo.todoId);
      if (savedTodo) {
        await this.saveTodoHistory(savedTodo, todo, notify);
      }
    }));
  }

  private async saveTodoHistory(savedTodo: Todo, history: ITodoHistory, notify: boolean = false) {
    try {
      const todoHistoryExists = await this.todoHistoryRepository.countBy({
        todo_id: savedTodo.id,
        property: Property.NAME,
        action: Action.CREATE,
      }) > 0;
      const { users, deadline, isDone, isClosed, editedBy } = history;
      const assignees = users.filter(user => !user.deleted_at) || [];
      const isDelayed = savedTodo.deadline
        ? diffDays(toJapanDateTime(savedTodo.deadline), toJapanDateTime(new Date())) > 0
        : null;
      const daysDiff = savedTodo.deadline && deadline
        ? diffDays(toJapanDateTime(savedTodo.deadline), toJapanDateTime(deadline))
        : null;
      type Args = [
        valueOf<typeof Property>,
        valueOf<typeof Action>,
          Info | null,    // New assignees & deadline
        boolean,        // Send notification?
      ];
      const argsList: Args[] = [];
      if (!todoHistoryExists) {  // If no data in db
        argsList.push([Property.NAME, Action.CREATE, null, notify]);
        assignees?.forEach(assignee => {
          argsList.push([Property.ASSIGNEE, Action.CREATE, { assignee }, false]);
        });
        if (deadline) {
          argsList.push([Property.DEADLINE, Action.CREATE, { deadline }, false]);
          if (isDelayed && !isDone && !isClosed) {
            argsList.push([Property.IS_DELAYED, Action.CREATE, null, false]);
          }
        }
        if (isDone) {
          argsList.push([Property.IS_DONE, Action.CREATE, null, notify]);
        }
        if (isClosed) {
          argsList.push([Property.IS_CLOSED, Action.CREATE, null, notify]);
        }
      } else {
        const [latestDelayedHistory, latestRecoveredHistory] = await Promise.all([
          this.todoHistoryRepository.findOne({
            where: { todo_id: savedTodo.id, property: Property.IS_DELAYED },
            order: { created_at: "DESC" },
          }),
          this.todoHistoryRepository.findOne({
            where: { todo_id: savedTodo.id, property: Property.IS_RECOVERED },
            order: { created_at: "DESC" },
          }),
        ]);
        if ((savedTodo.deadline || deadline) && daysDiff !== 0) {  // On deadline changed
          const action = !savedTodo.deadline ? Action.CREATE
            : !deadline ? Action.DELETE : Action.MODIFIED;
          argsList.push([Property.DEADLINE, action, { deadline, daysDiff }, notify]);
          if (latestRecoveredHistory && latestRecoveredHistory.action === Action.CREATE) {
            argsList.push([Property.IS_RECOVERED, Action.DELETE, null, notify]);
          }
        }
        // FIXME: 担当者の変更が複数同時に行われた場合に、変更数分通知されてしまう。
        const [deletedAssignees, addedAssignees] = extractDifferences(savedTodo.users, assignees, "id");
        addedAssignees.forEach(assignee => {
          argsList.push([Property.ASSIGNEE, Action.CREATE, { assignee }, notify]);
        });
        deletedAssignees.forEach(assignee => {
          argsList.push([Property.ASSIGNEE, Action.DELETE, { assignee }, notify]);
        });
        if (savedTodo.is_done !== isDone) { // On marked as done
          argsList.push([Property.IS_DONE, isDone ? Action.CREATE : Action.DELETE, null, notify]);
        }
        if (savedTodo.is_closed !== isClosed) { // On marked as closed
          argsList.push([Property.IS_CLOSED, isClosed ? Action.CREATE : Action.DELETE, null, notify]);
        }
        if (isDelayed) {  // When ddl is before today
          if (!isDone && latestDelayedHistory && latestDelayedHistory.action !== Action.CREATE) {
            argsList.push([Property.IS_DELAYED, Action.CREATE, null, notify]);
          }
        } else {  // When ddl is exactly or after today
          if (latestDelayedHistory && latestDelayedHistory.action !== Action.DELETE) {
            argsList.push([Property.IS_DELAYED, Action.DELETE, null, notify]);
          }
          if (latestRecoveredHistory && latestRecoveredHistory.action !== Action.DELETE) {
            argsList.push([Property.IS_RECOVERED, Action.DELETE, null, notify]);
          }
        }
      }
      await Promise.all(argsList.map(([property, action, info, notification]) => {
        return this.saveTodo(savedTodo, assignees, property, action, new Date(), info, notification, editedBy);
      }));
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  public async saveTodo(
    savedTodo: Todo,
    assignees: User[],
    property: valueOf<typeof Property>,
    action: valueOf<typeof Action>,
    updatedAt: Date,
    info: Info | null,
    notify?: boolean,
    editedBy?: number,
  ) {
    const todoHistory = new TodoHistory();
    todoHistory.todo_id = savedTodo.id;
    todoHistory.property = property;
    todoHistory.action = action;
    todoHistory.todoapp_reg_updated_at = updatedAt;
    todoHistory.deadline = info?.deadline ?? null;
    todoHistory.days_diff = info?.daysDiff ?? null;
    todoHistory.edited_by = editedBy;

    if (info?.assignee) {
      todoHistory.user_id = info?.assignee.id;
    }

    await this.todoHistoryRepository.save(todoHistory);

    if (notify) {
      await Promise.all(savedTodo.company?.chatTools?.map(
        chatTool => this.notifyOnUpdate(savedTodo, assignees, info?.deadline, property, action, chatTool),
      ));
    }
  }

  private async notifyOnUpdate(
    savedTodo: Todo,
    assignees: User[],
    deadline: Date,
    property: valueOf<typeof Property>,
    action: valueOf<typeof Action>,
    chatTool: ChatTool,
  ) {
    const code = chatTool.tool_code;
    if (property === Property.NAME && action === Action.CREATE) { // 新規追加
      switch (code) {
        case ChatToolCode.LINE:
          break;
        case ChatToolCode.SLACK:
          await this.slackRepository.notifyOnCreated(savedTodo, assignees, chatTool);
          break;
      }
    } else if (property === Property.IS_DONE && action === Action.CREATE) {  // 完了
      switch (code) {
        case ChatToolCode.LINE:
          break;
        case ChatToolCode.SLACK:
          await this.slackRepository.notifyOnCompleted(savedTodo, chatTool);
          break;
      }
    } else if (property === Property.ASSIGNEE) {  // 担当者
      switch (code) {
        case ChatToolCode.LINE:
          break;
        case ChatToolCode.SLACK:
          await this.slackRepository.notifyOnAssigneeUpdated(savedTodo, action, assignees, chatTool);
          break;
      }
    } else if (property === Property.DEADLINE) {  // 期日
      switch (code) {
        case ChatToolCode.LINE:
          break;
        case ChatToolCode.SLACK:
          await this.slackRepository.notifyOnDeadlineUpdated(savedTodo, action, deadline, chatTool);
          break;
      }
    } else if (property === Property.IS_CLOSED) {  // 保留
      switch (code) {
        case ChatToolCode.LINE:
          break;
        case ChatToolCode.SLACK:
          await this.slackRepository.notifyOnClosedUpdated(savedTodo, action, chatTool);
          break;
      }
    }
  }
}
