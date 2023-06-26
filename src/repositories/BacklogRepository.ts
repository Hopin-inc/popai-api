import { Service } from "typedi";
import {
  BacklogIssueWithDetail,
  BacklogMilestone,
  BacklogMilestoneDetail,
  BacklogWebhookPayload,
  MilestoneChangedPayload,
  MilestonePayload,
  MultiIssuesPayload,
  SingleIssuePayload,
} from "@/types/backlog";
import { HistoryAction, ProjectRule, TodoAppId, TodoHistoryProperty, UsageType } from "@/consts/common";
import Todo from "@/entities/transactions/Todo";
import Board from "@/entities/settings/Board";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import PropertyUsage from "@/entities/settings/PropertyUsage";
import {
  getUsageProperty,
  setHistoriesForExistingProject,
  setHistoriesForExistingTodo,
  setHistoriesForNewProject,
  setHistoriesForNewTodo,
} from "@/utils/misc";
import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import { TodoHistoryRepository } from "@/repositories/transactions/TodoHistoryRepository";
import { diffDays, toJapanDateTime } from "@/utils/datetime";
import { TodoUserRepository } from "@/repositories/transactions/TodoUserRepository";
import BacklogClient from "@/integrations/BacklogClient";
import {
  IProjectHistoryOption,
  IProjectUserUpdate,
  ITodoHistoryOption,
  ITodoProjectUpdate,
  ITodoUserUpdate,
} from "@/types";
import logger from "@/libs/logger";
import { ImplementedTodoAppRepository } from "@/repositories/settings/ImplementedTodoAppRepository";
import Project from "@/entities/transactions/Project";
import { TodoProjectRepository } from "@/repositories/transactions/TodoProjectRepository";
import { ProjectRepository } from "@/repositories/transactions/ProjectRepository";
import { ProjectHistoryRepository } from "@/repositories/transactions/ProjectHistoryRepository";
import { ProjectUserRepository } from "@/repositories/transactions/ProjectUserRepository";
import { ParentChild } from "@/consts/backlog";

type DateSet = {
  startDate: string | "",
  deadline: string | "",
};

@Service()
export default class BacklogRepository {
  public async deleteTodoByIssuePayload(
    companyId: string,
    payload: BacklogWebhookPayload<SingleIssuePayload>,
  ) {
    const deletedTodo = await TodoRepository.findOne({
      where: {
        companyId,
        todoAppId: TodoAppId.BACKLOG,
        appTodoId: payload?.content?.id?.toString(),
      },
      relations: ["todoUsers", "todoProjects"],
    });
    await this.deleteTodosByRecord([deletedTodo]);
  }

  public async deleteProjectByIssuePayload(
    companyId: string,
    payload: BacklogWebhookPayload<SingleIssuePayload>,
  ) {
    const deletedProject = await ProjectRepository.findOne({
      where: {
        companyId,
        todoAppId: TodoAppId.BACKLOG,
        appProjectId: payload?.content?.id?.toString(),
      },
      relations: ["projectUsers"],
    });
    if (deletedProject) {
      await this.deleteProjectsByRecord([deletedProject]);
    }
  }

  public async updateMultiTodos(
    companyId: string,
    payload: BacklogWebhookPayload<MultiIssuesPayload>,
    board: Board,
  ) {
    const targetIssueIds = payload.content.link.map(l => parseInt(l.id));
    await this.fetchTodos(companyId, payload.project.id, board, targetIssueIds);
  }

  public async createProjectByMilestonePayload(
    companyId: string,
    payload: BacklogWebhookPayload<MilestonePayload>,
    host: string,
    todoAppUsers: TodoAppUser[],
    companyProjects: Project[],
    board: Board,
  ) {
    if (board.projectRule !== ProjectRule.MILESTONE) {
      return;
    }
    const {
      project,
      isDelayed,
    } = this.generateProjectFromMilestonePayload(companyId, payload, companyProjects);
    const { id } = await ProjectRepository.save(project);
    const args = setHistoriesForNewProject(
      [],
      project.startDate,
      project.deadline,
      project.isDone,
      project.isClosed,
      isDelayed,
    );
    await ProjectHistoryRepository.saveHistories(args.map(a => ({ ...a, id })));
  }

  public async updateProjectByMilestonePayload(
    companyId: string,
    payload: BacklogWebhookPayload<MilestoneChangedPayload>,
    host: string,
    todoAppUsers: TodoAppUser[],
    companyProjects: Project[],
    board: Board,
  ) {
    if (board.projectRule !== ProjectRule.MILESTONE) {
      return;
    }
    const projectId = payload.project.id;
    const milestoneId = payload.content.id;
    const project = companyProjects.find(p => p.appProjectId === milestoneId.toString());
    const newDates: Partial<DateSet> = {};
    if (project) {
      const changesInProject: Partial<Project> = {};
      await Promise.all(payload.content.changes.map(async c => {
        switch (c.field) {
          case "name":
            changesInProject.name = c.new_value;
            break;
          case "startDate":
            newDates.startDate = c.new_value;
            break;
          case "referenceDate":
            newDates.deadline = c.new_value;
            break;
        }
        const { startDate, deadline } = this.getDeadline(
          newDates.startDate
            ? (newDates.startDate !== "" ? newDates.startDate : null)
            : project.startDate,
          newDates.deadline
            ? (newDates.deadline !== "" ? newDates.deadline : null)
            : project.deadline,
        );
        project.startDate = startDate;
        project.deadline = deadline;
        const isDelayed = deadline
          ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date())) > 0
          : null;
        const args = await setHistoriesForExistingProject(
          project,
          [],
          startDate,
          deadline,
          project.isDone,
          project.isClosed,
          isDelayed,
        );
        const updatedProject: Project = <Project>{ ...project, ...changesInProject, startDate, deadline };
        await Promise.all([
          ProjectRepository.upsert(updatedProject, []),
          ProjectHistoryRepository.saveHistories(args.map(a => ({ ...a, id: project.id }))),
        ]);
      }));
    } else {
      await this.createProjectByMilestoneId(companyId, projectId, milestoneId);
    }
  }

  public async createProjectByIssueId(
    companyId: string,
    issueId: number,
    todoAppUsers: TodoAppUser[],
    board: Board,
  ) {
    const client = await BacklogClient.init(companyId);
    const issue = await client.getIssue(issueId);
    if (issue) {
      await this.createProjectByIssueBody(companyId, issue, todoAppUsers, board);
    }
  }

  public async updateProjectOrTodoByIssueId(
    companyId: string,
    issueId: number,
    todoAppUsers: TodoAppUser[],
    companyProjects: Project[],
    board: Board,
    host: string,
  ) {
    const client = await BacklogClient.init(companyId);
    const issue = await client.getIssue(issueId);
    const properties = this.getProperties(board.propertyUsages);
    if (issue) {
      await this.registerProjectsOrTodosFromIssues(
        companyId,
        [issue],
        todoAppUsers,
        companyProjects,
        properties,
        board,
        host,
      );
    }
  }

  public async deleteProjectByMilestonePayload(
    companyId: string,
    payload: BacklogWebhookPayload<MilestonePayload>,
    board: Board,
  ) {
    if (board.projectRule !== ProjectRule.MILESTONE) {
      return;
    }
  }

  public async fetchTodos(
    companyId: string,
    projectId: number,
    board: Board,
    issueIds?: number[],
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
      const todoAppUsers = implementedTodoApp.company.users?.map(u => u.todoAppUser) ?? [];
      const fetchOrder = [ParentChild.EXCLUDE_CHILD, ParentChild.ONLY_CHILD];
      for (const parentChild of fetchOrder) {
        const limit = 100;
        let offset: number = 0;
        let hasMore: boolean = true;
        while (hasMore) {
          try {
            const [issues, companyProjects] = await Promise.all([
              client.getIssues([projectId], limit, offset, {
                parentChild,
                id: issueIds?.length ? issueIds : undefined,
              }),
              ProjectRepository.findBy({ companyId }),
            ]);
            hasMore = issues.length === limit;
            offset += issues.length;
            await this.registerProjectsOrTodosFromIssues(
              companyId,
              issues,
              todoAppUsers,
              companyProjects,
              properties,
              board,
              host,
            );
          } catch (error) {
            logger.error(error.message, error);
            break;
          }
        }
      }
    }
  }

  public async fetchMilestones(
    companyId: string,
    projectId: number,
    board: Board,
  ) {
    if (board.projectRule !== ProjectRule.MILESTONE) return;
    const client = await BacklogClient.init(companyId);
    const milestones = await client.getMilestones(projectId);
    await Promise.all(milestones.map(async milestone => {
      await this.createProjectByMilestoneBody(milestone, companyId);
    }));
  }

  private async createProjectByMilestoneId(
    companyId: string,
    projectId: number,
    milestoneId: number,
  ) {
    const client = await BacklogClient.init(companyId);
    const milestone = await client.getMilestone(projectId, milestoneId);
    if (milestone) {
      await this.createProjectByMilestoneBody(milestone, companyId);
    }
  }

  private async createProjectByMilestoneBody(
    milestone: BacklogMilestoneDetail,
    companyId: string,
  ) {
    const { startDate, deadline } = this.getDeadline(milestone.startDate, milestone.releaseDueDate);
    const isDone = milestone.archived || false;
    const isClosed = milestone.archived;
    const isDelayed = deadline
      ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date())) > 0
      : null;
    const project = new Project({
      name: milestone.name,
      todoAppId: TodoAppId.BACKLOG,
      company: companyId,
      appProjectId: milestone.id.toString(),
      startDate,
      deadline,
      isDone,
      isClosed,
    });
    const { id } = await ProjectRepository.save(project);
    const args = setHistoriesForNewProject([], startDate, deadline, isDone, isClosed, isDelayed);
    await ProjectHistoryRepository.saveHistories(args.map(a => ({ ...a, id })));
  }

  private async createProjectByIssueBody(
    companyId: string,
    issue: BacklogIssueWithDetail,
    todoAppUsers: TodoAppUser[],
    board: Board,
  ) {
    const properties = this.getProperties(board.propertyUsages);
    const { startDate, deadline } = this.getDeadline(issue.startDate, issue.dueDate);
    const isDone = this.isInStatus(properties.isDone, issue.status.id.toString());
    const isClosed = this.isInStatus(properties.isClosed, issue.status.id.toString());
    const isDelayed = deadline
      ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date())) > 0
      : null;
    const project = new Project({
      name: issue.summary,
      todoAppId: TodoAppId.BACKLOG,
      company: companyId,
      appProjectId: issue.id.toString(),
      startDate,
      deadline,
      isDone,
      isClosed,
    });
    const users = this.getAssignees(todoAppUsers, issue.assignee?.id);
    const { id } = await ProjectRepository.save(project);
    const args = setHistoriesForNewProject(users, startDate, deadline, isDone, isClosed, isDelayed);
    await Promise.all([
      ProjectUserRepository.saveProjectUsers([{ projectId: id, users, currentUserIds: [] }]),
      ProjectHistoryRepository.saveHistories(args.map(a => ({ ...a, id }))),
    ]);
  }

  private async registerProjectsOrTodosFromIssues(
    companyId: string,
    issues: BacklogIssueWithDetail[],
    todoAppUsers: TodoAppUser[],
    companyProjects: Project[],
    properties: ReturnType<typeof this.getProperties>,
    board: Board,
    host: string,
  ) {
    const [existingProjects, existingTodos] = await Promise.all([
      ProjectRepository.findByAppIds(TodoAppId.BACKLOG, issues.map(i => i.id.toString()), companyId),
      TodoRepository.findByAppIds(TodoAppId.BACKLOG, issues.map(i => i.id.toString()), companyId),
    ]);

    const updatedProjects: Project[] = [];
    const deletedProjects: Project[] = [];
    const updatedTodos: Todo[] = [];
    const deletedTodos: Todo[] = [];
    const projectUserUpdates: IProjectUserUpdate[] = [];
    const projectHistoryArgs: IProjectHistoryOption[] = [];
    const todoUserUpdates: ITodoUserUpdate[] = [];
    const todoProjectUpdates: ITodoProjectUpdate[] = [];
    const todoHistoryArgs: ITodoHistoryOption[] = [];
    await Promise.all(issues.map(async issue => {
      try {
        const { startDate, deadline } = this.getDeadline(issue.startDate, issue.dueDate);
        const isDone = this.isInStatus(properties.isDone, issue.status.id.toString());
        const isClosed = this.isInStatus(properties.isClosed, issue.status.id.toString());

        const existingProject = existingProjects.find(t => t.appProjectId === issue.id?.toString());
        const existingTodo = existingTodos.find(t => t.appTodoId === issue.id?.toString());
        const users = this.getAssignees(todoAppUsers, issue.assignee?.id);
        const projects = this.getProjects(companyProjects, board, issue.parentIssueId, issue.milestone);
        const isDelayed = deadline
          ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date())) > 0
          : null;
        const registerAsProject: boolean = (board.projectRule === ProjectRule.PARENT_TODO && !issue.parentIssueId);
        const registerAsTodo: boolean = board.projectRule === ProjectRule.MILESTONE
          || (board.projectRule === ProjectRule.PARENT_TODO && !!issue.parentIssueId);
        if (registerAsProject) {
          if (existingProject) {
            const args = await setHistoriesForExistingProject(
              existingProject,
              users,
              startDate,
              deadline,
              isDone,
              isClosed,
              isDelayed,
            );
            Object.assign(existingProject, <Partial<Project>>{
              name: issue.summary,
              companyId,
              startDate,
              deadline,
              isDone,
              isClosed,
              updatedAt: toJapanDateTime(new Date()),
            });
            updatedProjects.push(existingProject);
            projectUserUpdates.push({
              projectId: existingProject.id,
              users,
              currentUserIds: existingProject.todoUsers?.map(tu => tu.userId) ?? [],
            });
            projectHistoryArgs.push(...args.map(a => (<IProjectHistoryOption>{
              ...a,
              id: existingProject.id,
            })));
          } else {
            if (existingTodo) {
              deletedTodos.push(existingTodo);
            }
            const project = new Project({
              name: issue.summary,
              todoAppId: TodoAppId.BACKLOG,
              company: companyId,
              appProjectId: issue.id?.toString(),
              appUrl: this.generateTodoUrl(host, issue.issueKey),
              appCreatedAt: new Date(issue.created),
              appCreatedBy: issue.assignee?.id.toString(),
              startDate,
              deadline,
              isDone,
              isClosed,
            });
            const savedProject = await ProjectRepository.save(project);
            projectUserUpdates.push({ projectId: savedProject.id, users, currentUserIds: [] });
            const args = setHistoriesForNewProject(
              users,
              startDate,
              deadline,
              isDone,
              isClosed,
              isDelayed,
            );
            projectHistoryArgs.push(...args.map(a => (<IProjectHistoryOption>{
              ...a,
              id: savedProject.id,
            })));
          }
        } else if (registerAsTodo) {
          const appParentIds = board.projectRule === ProjectRule.PARENT_TODO && issue.parentIssueId
            ? [issue.parentIssueId.toString()]
            : null;
          if (existingTodo) {
            const args = await setHistoriesForExistingTodo(
              existingTodo,
              users,
              projects,
              startDate,
              deadline,
              isDone,
              isClosed,
              isDelayed,
            );
            Object.assign(existingTodo, <Partial<Todo>>{
              name: issue.summary,
              companyId,
              appParentIds,
              startDate,
              deadline,
              isDone,
              isClosed,
              updatedAt: toJapanDateTime(new Date()),
            });
            updatedTodos.push(existingTodo);
            todoUserUpdates.push({
              todoId: existingTodo.id,
              users,
              currentUserIds: existingTodo.todoUsers?.map(tu => tu.userId) ?? [],
            });
            todoProjectUpdates.push({
              todoId: existingTodo.id,
              projects,
              currentProjectIds: existingTodo.todoProjects?.map(tp => tp.projectId) ?? [],
            });
            todoHistoryArgs.push(...args.map(a => (<ITodoHistoryOption>{
              ...a,
              id: existingTodo.id,
            })));
          } else {
            if (existingProject) {
              deletedProjects.push(existingProject);
            }
            const todo = new Todo({
              name: issue.summary,
              todoAppId: TodoAppId.BACKLOG,
              company: companyId,
              appTodoId: issue.id.toString(),
              appParentIds,
              appUrl: this.generateTodoUrl(host, issue.issueKey),
              appCreatedAt: new Date(issue.created),
              appCreatedBy: issue.assignee?.id.toString(),
              startDate,
              deadline,
              isDone,
              isClosed,
            });
            const savedTodo = await TodoRepository.save(todo);
            todoUserUpdates.push({ todoId: savedTodo.id, users, currentUserIds: [] });
            todoProjectUpdates.push({ todoId: savedTodo.id, projects, currentProjectIds: [] });
            const args = setHistoriesForNewTodo(
              users,
              projects,
              startDate,
              deadline,
              isDone,
              isClosed,
              isDelayed,
            );
            todoHistoryArgs.push(...args.map(a => (<ITodoHistoryOption>{
              ...a,
              id: savedTodo.id,
            })));
          }
        }
      } catch (error) {
        logger.error(error.message, error);
      }
    }));
    await Promise.all([
      ProjectRepository.upsert(updatedProjects, []),
      ProjectUserRepository.saveProjectUsers(projectUserUpdates),
      ProjectHistoryRepository.saveHistories(projectHistoryArgs),
      this.deleteProjectsByRecord(deletedProjects),
      TodoRepository.upsert(updatedTodos, []),
      TodoUserRepository.saveTodoUsers(todoUserUpdates),
      TodoProjectRepository.saveTodoProjects(todoProjectUpdates),
      TodoHistoryRepository.saveHistories(todoHistoryArgs),
      this.deleteTodosByRecord(deletedTodos),
    ]);
  }

  private async deleteProjectsByRecord(projects: Project[]) {
    if (!projects.length) {
      return;
    }
    await Promise.all([
      ProjectRepository.softRemove(projects),
      ProjectHistoryRepository.saveHistories(projects.map(project => ({
        id: project.id,
        property: TodoHistoryProperty.NAME,
        action: HistoryAction.DELETE,
      }))),
    ]);
  }

  private async deleteTodosByRecord(todos: Todo[]) {
    await Promise.all([
      TodoRepository.softRemove(todos),
      TodoHistoryRepository.saveHistories(todos.map(todo => ({
        id: todo.id,
        property: TodoHistoryProperty.NAME,
        action: HistoryAction.DELETE,
      }))),
    ]);
  }

  private generateProjectFromMilestonePayload(
    companyId: string,
    payload: BacklogWebhookPayload<MilestonePayload>,
    companyProjects: Project[],
  ): { project: Project, isDelayed: boolean } {
    const { content, created, createdUser } = payload ?? {};
    const name = content.name;
    const { startDate, deadline } = this.getDeadline(content.start_date, content.reference_date);
    const isDone = false; // TODO: 該当タスクが全て完了しているかで判断する？
    const isClosed = false;
    let project = companyProjects.find(p => p.appProjectId === content.id.toString());
    if (project) {
      Object.assign(project, <Project>{ name, startDate, deadline, isDone, isClosed });
    } else {
      project = new Project({
        name,
        todoAppId: TodoAppId.BACKLOG,
        company: companyId,
        appProjectId: content.id?.toString(),
        appUrl: null,
        appCreatedAt: new Date(created),
        appCreatedBy: createdUser.id.toString(),
        startDate,
        deadline,
        isDone,
        isClosed,
      });
    }
    const isDelayed = deadline
      ? diffDays(toJapanDateTime(deadline), toJapanDateTime(new Date())) > 0
      : null;
    return { project, isDelayed };
  }

  private getProperties(usages: PropertyUsage[]) {
    const propertyIds = ["status"];
    return {
      isDone: getUsageProperty(usages, propertyIds, UsageType.IS_DONE),
      isClosed: getUsageProperty(usages, propertyIds, UsageType.IS_CLOSED),
    };
  }

  private getAssignees(todoAppUsers: TodoAppUser[], appUserId: number) {
    return todoAppUsers
      .filter(tau => tau.appUserId === appUserId?.toString())
      .map(tau => tau.user);
  }

  private getProjects(
    companyProjects: Project[],
    board: Board,
    parentIssueId?: number,
    milestones?: BacklogMilestone[],
  ): Project[] {
    if (board.projectRule === ProjectRule.PARENT_TODO && parentIssueId) {
      return companyProjects.filter(p => p.appProjectId === parentIssueId.toString());
    } else if (board.projectRule === ProjectRule.MILESTONE && milestones) {
      return companyProjects
        .filter(p => {
          return milestones
            .map(m => m.id?.toString())
            .includes(p.appProjectId);
        });
    } else {
      return [];
    }
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
    if (!usage) {
      return false;
    } else {
      return usage.appOptions?.includes(statusId);
    }
  }
}
