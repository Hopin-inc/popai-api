import { Service } from "typedi";
import { BacklogWebhookPayload, MultiIssuesPayload, SingleIssuePayload } from "@/types/backlog";
import { TodoAppId, UsageType } from "@/consts/common";
import Todo from "@/entities/transactions/Todo";
import Board from "@/entities/settings/Board";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import PropertyUsage from "@/entities/settings/PropertyUsage";
import { getUsageProperty, setHistoriesForExistingTodo, setHistoriesForNewTodo } from "@/utils/misc";
import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import { TodoHistoryRepository } from "@/repositories/transactions/TodoHistoryRepository";
import { diffDays, toJapanDateTime } from "@/utils/datetime";
import User from "@/entities/settings/User";
import { TodoUserRepository } from "@/repositories/transactions/TodoUserRepository";
import { In, IsNull } from "typeorm";
import BacklogClient from "@/integrations/BacklogClient";
import { ITodoHistoryOption, ITodoUserUpdate } from "@/types";
import logger from "@/libs/logger";
import { TodoAppUserRepository } from "@/repositories/settings/TodoAppUserRepository";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";

type DateSet = {
  startDate: string | "",
  deadline: string | "",
};

@Service()
export default class BacklogRepository {
  private backlogClient: BacklogClient;

  public async createTodo(
    companyId: string,
    payload: BacklogWebhookPayload<SingleIssuePayload>,
    host: string,
    todoAppUsers: TodoAppUser[],
    board: Board,
  ) {
    const { todo, assignees, isDelayed } = this.generateTodoFromPayload(companyId, payload, host, todoAppUsers, board);
    const { id: todoId } = await TodoRepository.save(todo) ?? {};
    const { startDate, deadline, isDone, isClosed } = todo;
    const args = setHistoriesForNewTodo(assignees, startDate, deadline, isDone, isClosed, isDelayed);
    await Promise.all([
      TodoHistoryRepository.saveHistories(args.map(a => ({ ...a, todoId }))),
      TodoUserRepository.saveTodoUsers([{ todoId, users: assignees, currentUserIds: [] }]),
    ]);
  }

  public async updateTodo(
    companyId: string,
    payload: BacklogWebhookPayload<SingleIssuePayload>,
    host: string,
    todoAppUsers: TodoAppUser[],
    board: Board,
  ) {
    const existingTodo = await TodoRepository.findOne({
      where: {
        companyId,
        todoAppId: TodoAppId.BACKLOG,
        appTodoId: payload?.content?.id?.toString(),
      },
      relations: ["todoUsers"],
    });
    if (existingTodo) {
      const currentUserIds = existingTodo.todoUsers.map(tu => tu.userId);
      const {
        todo,
        assignees,
        isDelayed,
      } = this.generateTodoFromPayload(companyId, payload, host, todoAppUsers, board, existingTodo);
      const { startDate, deadline, isDone, isClosed } = todo;
      const args = await setHistoriesForExistingTodo(
        existingTodo,
        assignees,
        startDate,
        deadline,
        isDone,
        isClosed,
        isDelayed,
      );
      await Promise.all([
        TodoRepository.upsert(todo, []),
        TodoHistoryRepository.saveHistories(args.map(a => ({ ...a, todoId: todo.id }))),
        TodoUserRepository.saveTodoUsers([{ todoId: todo.id, users: assignees, currentUserIds }]),
      ]);
    } else {
      await this.createTodo(companyId, payload, host, todoAppUsers, board);
    }
  }

  public async deleteTodo(
    companyId: string,
    payload: BacklogWebhookPayload<SingleIssuePayload>,
  ) {
    const deletedTodo = await TodoRepository.findOne({
      where: {
        companyId,
        todoAppId: TodoAppId.BACKLOG,
        appTodoId: payload?.content?.id?.toString(),
      },
      relations: ["todoUsers"],
    });
    await TodoRepository.softRemove(deletedTodo);
  }

  public async updateMultiTodos(
    companyId: string,
    payload: BacklogWebhookPayload<MultiIssuesPayload>,
    todoAppUsers: TodoAppUser[],
    board: Board,
  ) {
    const properties = this.getProperties(board.propertyUsages);
    const targetAppTodoIds = payload.content.link.map(l => l.id);
    const targetTodos = await TodoRepository.find({
      where: {
        companyId,
        todoAppId: TodoAppId.BACKLOG,
        appTodoId: In(targetAppTodoIds),
      },
      relations: ["todoUsers"],
    });
    const changesInTodo: Partial<Todo> = {};
    const newDates: Partial<DateSet> = {};
    let newAssigneeId: string | null = null;
    let fetchAssignee: boolean = false;
    await Promise.all(payload.content.changes.map(async c => {
      switch (c.field) {
        case "status":
          changesInTodo.isDone = this.isInStatus(properties.isDone, c.new_value);
          changesInTodo.isClosed = this.isInStatus(properties.isClosed, c.new_value);
          break;
        case "startDate":
          newDates.startDate = c.new_value;
          break;
        case "limitDate":
          newDates.deadline = c.new_value;
          break;
        case "assigner":
          this.backlogClient = await BacklogClient.init(companyId);
          const users = await this.backlogClient.getUsers();
          const targetUsers = users.filter(u => u.name === c.new_value);
          if (targetUsers.length === 1) {
            newAssigneeId = users[0].id?.toString();
          } else {
            fetchAssignee = true;
          }
          break;
      }
    }));
    if (fetchAssignee && this.backlogClient && targetAppTodoIds?.length) {
      const issue = await this.backlogClient.getIssue(parseInt(targetAppTodoIds[0]));
      newAssigneeId = issue?.assignee?.id?.toString();
    }
    await Promise.all(targetTodos.map(todo => {
      return this.updateTodoInMulti(todo, todoAppUsers, changesInTodo, newDates, newAssigneeId);
    }));
  }

  public async fetchTodos(
    companyId: string,
    projectId: number,
    board: Board,
  ) {
    const properties = this.getProperties(board.propertyUsages);
    const [client, implementedTodoApp] = await Promise.all([
      BacklogClient.init(companyId),
      ImplementedTodoAppRepository.findOne({
        where: { companyId, todoAppId: TodoAppId.BACKLOG },
        relations: ["company.users.todoAppUser.user"],
      }),
    ]);
    if (implementedTodoApp) {
      const host = implementedTodoApp.appWorkspaceId;
      const todoAppUsers = implementedTodoApp.company.users.map(u => u.todoAppUser);
      const limit = 100;
      let offset: number = 0;
      let hasMore: boolean = true;
      while (hasMore) {
        try {
          const issues = await client.getIssues([projectId], limit, offset);
          const existingTodos = await TodoRepository.find({
            where: { appTodoId: In(issues?.map(i => i.id)) },
            relations: ["todoUsers"],
          });
          hasMore = issues.length === limit;
          offset += issues.length;

          const updatedTodos: Todo[] = [];
          const todoUserUpdates: ITodoUserUpdate[] = [];
          const todoHistoryArgs: ITodoHistoryOption[] = [];
          await Promise.all(issues.map(async issue => {
            const { startDate, deadline } = this.getDeadline(issue.startDate, issue.dueDate);
            const isDone = this.isInStatus(properties.isDone, issue.status.id.toString());
            const isClosed = this.isInStatus(properties.isClosed, issue.status.id.toString());

            const existingTodo = existingTodos.find(t => t.appTodoId === issue.id?.toString());
            const users = todoAppUsers
              .filter(tau => tau.appUserId === issue.assignee?.id.toString())
              .map(tau => tau.user);
            const isDelayed = deadline
              ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date())) > 0
              : null;
            if (existingTodo) {
              const args = await setHistoriesForExistingTodo(existingTodo, users, startDate, deadline, isDone, isClosed, isDelayed);
              Object.assign(existingTodo, <Partial<Todo>>{
                name: issue.summary,
                companyId,
                appUrl: this.generateTodoUrl(host, issue.issueKey),
                appCreatedAt: new Date(issue.created),
                createdBy: issue.assignee?.id.toString(),
                startDate,
                deadline,
                isDone,
                isClosed,
              });
              updatedTodos.push(existingTodo);
              todoUserUpdates.push({
                todoId: existingTodo.id,
                users,
                currentUserIds: existingTodo.todoUsers.map(tu => tu.userId),
              });
              todoHistoryArgs.push(...args.map(a => (<ITodoHistoryOption>{
                ...a,
                todoId: existingTodo.id,
              })));
            } else {
              const todo = new Todo({
                name: issue.summary,
                todoAppId: TodoAppId.BACKLOG,
                company: companyId,
                appTodoId: issue.id?.toString(),
                appUrl: this.generateTodoUrl(host, issue.issueKey),
                appCreatedAt: new Date(issue.created),
                createdBy: issue.assignee?.id.toString(),
                startDate,
                deadline,
                isDone,
                isClosed,
              });
              const savedTodo = await TodoRepository.save(todo);
              todoUserUpdates.push({ todoId: savedTodo.id, users, currentUserIds: [] });
              const args = setHistoriesForNewTodo(users, startDate, deadline, isDone, isClosed, isDelayed);
              todoHistoryArgs.push(...args.map(a => (<ITodoHistoryOption>{
                ...a,
                todoId: savedTodo.id,
              })));
            }
          }));
          await Promise.all([
            TodoRepository.upsert(updatedTodos, []),
            TodoUserRepository.saveTodoUsers(todoUserUpdates),
            TodoHistoryRepository.saveHistories(todoHistoryArgs),
          ]);
        } catch (error) {
          logger.error(error);
          break;
        }
      }
    }
  }

  private generateTodoFromPayload(
    companyId: string,
    payload: BacklogWebhookPayload<SingleIssuePayload>,
    host: string,
    todoAppUsers: TodoAppUser[],
    board: Board,
    todo?: Todo,
  ): { todo: Todo, assignees: User[], isDelayed: boolean } {
    const { project, content, created } = payload ?? {};
    const properties = this.getProperties(board.propertyUsages);
    const name = content.summary;
    const { startDate, deadline } = this.getDeadline(content.startDate, content.dueDate);
    const isDone = this.isInStatus(properties.isDone, content.status.id.toString());
    const isClosed = this.isInStatus(properties.isClosed, content.status.id.toString());
    if (todo) {
      Object.assign(todo, <Todo>{ name, startDate, deadline, isDone, isClosed });
    } else {
      todo = new Todo({
        name,
        todoAppId: TodoAppId.BACKLOG,
        company: companyId,
        appTodoId: content.id?.toString(),
        appUrl: this.generateTodoUrl(host, `${ project.projectKey }-${ content.key_id }`),
        appCreatedAt: new Date(created),
        createdBy: content.assignee?.id.toString(),
        startDate,
        deadline,
        isDone,
        isClosed,
      });
    }
    const assignees = todoAppUsers
      .filter(tau => tau.appUserId === content.assignee?.id.toString())
      .map(tau => tau.user);
    const isDelayed = deadline
      ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date())) > 0
      : null;
    return { todo, assignees, isDelayed };
  }

  private async updateTodoInMulti(
    todo: Todo,
    todoAppUsers: TodoAppUser[],
    changesInTodo: Partial<Todo>,
    newDates: Partial<DateSet>,
    newAssigneeId: string | null,
  ) {
    const currentUserIds = todo.todoUsers.map(tu => tu.userId);
    const { startDate, deadline } = this.getDeadline(
      newDates.startDate
        ? (newDates.startDate !== "" ? newDates.startDate : null)
        : todo.startDate,
      newDates.deadline
        ? (newDates.deadline !== "" ? newDates.deadline : null)
        : todo.deadline,
    );
    const updatedTodo: Todo = <Todo>{ ...todo, ...changesInTodo, startDate, deadline };
    const assignees = newAssigneeId !== ""
      ? todoAppUsers
        .filter(tau => tau.appUserId === newAssigneeId)
        .map(tau => tau.user)
      : [];
    const isDelayed = deadline
      ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date())) > 0
      : null;
    const args = await setHistoriesForExistingTodo(
      todo,
      assignees,
      startDate,
      deadline,
      updatedTodo.isDone,
      updatedTodo.isClosed,
      isDelayed,
    );
    await Promise.all([
      TodoRepository.upsert(updatedTodo, []),
      TodoHistoryRepository.saveHistories(args.map(a => ({ ...a, todoId: updatedTodo.id }))),
      TodoUserRepository.saveTodoUsers([{ todoId: updatedTodo.id, users: assignees, currentUserIds }]),
    ]);
  }

  private getProperties(usages: PropertyUsage[]) {
    const propertyIds = ["status"];
    return {
      isDone: getUsageProperty(usages, propertyIds, UsageType.IS_DONE),
      isClosed: getUsageProperty(usages, propertyIds, UsageType.IS_CLOSED),
    };
  }

  private generateTodoUrl(hostOrBaseUrl: string, issueKey: string, isBaseUrl: boolean = false) {
    const baseUrl = isBaseUrl ? hostOrBaseUrl : `https://${ hostOrBaseUrl }`;
    return `${ baseUrl }/view/${ issueKey }`;
  }

  private getDeadline(startDate: Date | string | null, dueDate: Date | string | null) {
    startDate = startDate instanceof Date ? startDate : startDate ? new Date(startDate) : undefined;
    dueDate = dueDate instanceof Date ? dueDate : dueDate ? new Date(dueDate) : undefined;
    const start = startDate ?? dueDate ?? undefined;
    const deadline = dueDate ?? undefined;
    return { startDate: start, deadline: deadline };
  }

  private isInStatus(usage: PropertyUsage, statusId: string) {
    return usage.appOptions?.includes(statusId);
  }
}
