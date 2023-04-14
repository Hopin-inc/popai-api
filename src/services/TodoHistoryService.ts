import { Container, Service } from "typedi";

import Todo from "@/entities/transactions/Todo";
import TodoHistory from "@/entities/transactions/TodoHistory";
import User from "@/entities/settings/User";
import ChatTool from "@/entities/masters/ChatTool";
import TodoAppUser from "@/entities/settings/TodoAppUser";

import logger from "@/logger/winston";
import { ITodoHistory, ValueOf } from "@/types";
import {
  TodoHistoryProperty as Property,
  TodoHistoryAction as Action,
  TodoAppId,
  ChatToolId,
} from "@/consts/common";

import { diffDays, extractDifferences, toJapanDateTime } from "@/utils/common";
import SlackRepository from "@/repositories/SlackRepository";
import { TodoHistoryRepository } from "@/repositories/transactions/TodoHistoryRepository";
import { TodoAppUserRepository } from "@/repositories/settings/TodoAppUserRepository";
import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import { NotifyConfigRepository } from "@/repositories/settings/NotifyConfigRepository";
import NotionService from "@/services/NotionService";

type Info = { deadline?: Date, assignee?: User, daysDiff?: number };

@Service()
export default class TodoHistoryService {
  private slackRepository: SlackRepository;

  constructor() {
    this.slackRepository = Container.get(SlackRepository);
  }

  public async saveTodoHistories(savedTodos: Todo[], todos: ITodoHistory[], notify: boolean = false): Promise<void> {
    await Promise.all(todos.map(async todo => {
      const savedTodo = savedTodos.find(t => t.todoapp_reg_id === todo.todoId && t.company_id === todo.companyId);
      if (savedTodo) {
        await this.saveTodoHistory(savedTodo, todo, notify);
      }
    }));
  }

  private async saveTodoHistory(savedTodo: Todo, history: ITodoHistory, notify: boolean = false) {
    try {
      const todoHistoryExists = await TodoHistoryRepository.countBy({
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
        ValueOf<typeof Property>,
        ValueOf<typeof Action>,
        (Info | null),    // New assignees & deadline
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
            where: { todo_id: savedTodo.id, property: Property.IS_DELAYED },
            order: { created_at: "DESC" },
          }),
          TodoHistoryRepository.findOne({
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
      if (savedTodo.todoapp_id === TodoAppId.NOTION) {  // TODO: Add operations in case of Microsoft and Trello.
        const notionClient = await NotionService.init(savedTodo.company_id);
        if (notionClient) {
          await Promise.all(argsList.map(async (args) => {
            const [property, action, info] = args;
            const history = new TodoHistory(savedTodo, assignees, property, action, new Date(), info, editedBy);
            await TodoHistoryRepository.save(history);
            if (notify) {
              await Promise.all(savedTodo.company?.implementedChatTools?.map(async (chatTool) => {
                const activeTodo: Todo = await TodoRepository.getNotArchivedTodoInNotion(savedTodo, notionClient);
                if (activeTodo) {
                  const editUser: TodoAppUser = await TodoAppUserRepository.findOne({
                    where: { employee_id: editedBy, todoapp_id: savedTodo.todoapp_id },
                    relations: ["user"],
                  });
                  await this.notifyOnUpdate(savedTodo, assignees, info?.deadline, property, action, chatTool.chattool, editUser);
                }
              }));
            }
          }));
        }
      }
    } catch (error) {
      logger.error(error);
    }
  }

  private async notifyOnUpdate(
    savedTodo: Todo,
    assignees: User[],
    deadline: Date,
    property: ValueOf<typeof Property>,
    action: ValueOf<typeof Action>,
    chatTool: ChatTool,
    editUser: TodoAppUser,
  ) {
    const configRecord = await NotifyConfigRepository.findOneBy({
      company_id: savedTodo.company_id,
      enabled: true,
    });
    const channelId = configRecord.channel;

    if (property === Property.NAME && action === Action.CREATE) { // 新規追加
      switch (chatTool.id) {
        case ChatToolId.LINE:
          break;
        case ChatToolId.SLACK:
          await this.slackRepository.notifyOnCreated(savedTodo, assignees, chatTool, editUser, channelId);
          break;
      }
    } else if (property === Property.IS_DONE && action === Action.CREATE) {  // 完了
      switch (chatTool.id) {
        case ChatToolId.LINE:
          break;
        case ChatToolId.SLACK:
          await this.slackRepository.notifyOnCompleted(savedTodo, chatTool, editUser, channelId);
          break;
      }
    } else if (property === Property.ASSIGNEE) {  // 担当者
      switch (chatTool.id) {
        case ChatToolId.LINE:
          break;
        case ChatToolId.SLACK:
          await this.slackRepository.notifyOnAssigneeUpdated(savedTodo, action, assignees, chatTool, editUser, channelId);
          break;
      }
    } else if (property === Property.DEADLINE) {  // 期日
      switch (chatTool.id) {
        case ChatToolId.LINE:
          break;
        case ChatToolId.SLACK:
          await this.slackRepository.notifyOnDeadlineUpdated(savedTodo, action, deadline, chatTool, editUser, channelId);
          break;
      }
    } else if (property === Property.IS_CLOSED) {  // 保留
      switch (chatTool.id) {
        case ChatToolId.LINE:
          break;
        case ChatToolId.SLACK:
          await this.slackRepository.notifyOnClosedUpdated(savedTodo, action, chatTool, editUser, channelId);
          break;
      }
    }
  }
}
