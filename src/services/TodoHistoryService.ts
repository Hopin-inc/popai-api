import { Container, Service } from "typedi";

import Todo from "@/entities/transactions/Todo";
import TodoHistory from "@/entities/transactions/TodoHistory";
import User from "@/entities/settings/User";

import logger from "@/libs/logger";
import { ITodoHistory, ValueOf } from "@/types";
import {
  TodoHistoryProperty as Property,
  TodoHistoryAction as Action,
} from "@/consts/common";
import { diffDays, toJapanDateTime } from "@/utils/datetime";
import { extractDifferences } from "@/utils/array";
import SlackRepository from "@/repositories/SlackRepository";
import { TodoHistoryRepository } from "@/repositories/transactions/TodoHistoryRepository";

type Info = { deadline?: Date, assignee?: User, daysDiff?: number };

@Service()
export default class TodoHistoryService {
  private slackRepository: SlackRepository;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
  }

  public async save(savedTodos: Todo[], todos: ITodoHistory[], notify: boolean = false): Promise<void> {
    await Promise.all(todos.map(async todo => {
      const savedTodo = savedTodos.find(t => t.appTodoId === todo.todoId && t.companyId === todo.companyId);
      if (savedTodo) {
        await this.saveHistory(savedTodo, todo, notify);
      }
    }));
  }

  private async saveHistory(savedTodo: Todo, history: ITodoHistory, notify: boolean = false) {
    try {
      const todoHistoryExists = await TodoHistoryRepository.countBy({
        todoId: savedTodo.id,
        property: Property.NAME,
        action: Action.CREATE,
      }) > 0;
      const { users, deadline, isDone, isClosed } = history;
      const assignees = users.filter(user => !user.deletedAt) || [];
      const isDelayed = savedTodo.deadline
        ? diffDays(toJapanDateTime(savedTodo.deadline), toJapanDateTime(new Date())) > 0
        : null;
      const daysDiff = savedTodo.deadline && deadline
        ? diffDays(toJapanDateTime(savedTodo.deadline), toJapanDateTime(deadline))
        : null;
      type Args = [
        ValueOf<typeof Property>,
        ValueOf<typeof Action>,
        (Info | null),  // New assignees & deadline
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
          TodoHistoryRepository.findOne({
            where: { todoId: savedTodo.id, property: Property.IS_DELAYED },
            order: { createdAt: "DESC" },
          }),
          TodoHistoryRepository.findOne({
            where: { todoId: savedTodo.id, property: Property.IS_RECOVERED },
            order: { createdAt: "DESC" },
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
        const [deletedAssignees, addedAssignees] = extractDifferences(savedTodo.users, assignees, "id");
        addedAssignees.forEach(assignee => {
          argsList.push([Property.ASSIGNEE, Action.CREATE, { assignee }, notify]);
        });
        deletedAssignees.forEach(assignee => {
          argsList.push([Property.ASSIGNEE, Action.DELETE, { assignee }, notify]);
        });
        if (savedTodo.isDone !== isDone) { // On marked as done
          argsList.push([Property.IS_DONE, isDone ? Action.CREATE : Action.DELETE, null, notify]);
        }
        if (savedTodo.isClosed !== isClosed) { // On marked as closed
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
      await Promise.all(argsList.map(async (args) => {
        const [property, action, info] = args;
        const history = new TodoHistory(savedTodo, assignees, property, action, new Date(), info);
        await TodoHistoryRepository.save(history);
      }));
    } catch (error) {
      logger.error(error);
    }
  }
}
