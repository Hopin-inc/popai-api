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
import { In } from "typeorm";
import BacklogClient from "@/integrations/BacklogClient";

type DateSet = {
  startDate: string | "",
  deadline: string | "",
};

@Service()
export default class BacklogRepository {
  public async createTodo(
    companyId: string,
    payload: BacklogWebhookPayload<SingleIssuePayload>,
    host: string,
    todoAppUsers: TodoAppUser[],
    board: Board,
  ) {
    const { todo, assignees, isDelayed } = this.generateTodo(companyId, payload, host, todoAppUsers, board);
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
      } = this.generateTodo(companyId, payload, host, todoAppUsers, board, existingTodo);
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
          const client = await BacklogClient.init(companyId);
          const users = await client.getUsers();
          newAssigneeId = users.find(u => u.name === c.new_value)?.id?.toString();
          break;
      }
    }));
    await Promise.all(targetTodos.map(todo => {
      return this.updateTodoInMulti(todo, todoAppUsers, changesInTodo, newDates, newAssigneeId);
    }));
  }

  private generateTodo(
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
        appUrl: this.generateTodoUrl(host, project.projectKey, content.key_id),
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

  private generateTodoUrl(host: string, projectKey: string, keyId: number) {
    return `https://${ host }/view/${ projectKey }-${ keyId }`;
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
