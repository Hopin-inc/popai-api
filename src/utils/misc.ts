import "moment-timezone";
import dayjs from "dayjs";
import { diffDays, toJapanDateTime } from "@/utils/datetime";
import { extractDifferences, roundMinutes } from "@/utils/array";
import PropertyUsage from "@/entities/settings/PropertyUsage";
import { IProjectHistoryOption, ITodoHistoryOption } from "@/types";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";
import { TodoHistoryRepository } from "@/repositories/transactions/TodoHistoryRepository";
import {
  HistoryAction as Action,
  TodoHistoryProperty as Property,
} from "@/consts/common";
import { ProjectHistoryRepository } from "@/repositories/transactions/ProjectHistoryRepository";
import Project from "@/entities/transactions/Project";


export const randomInt = (max: number, min: number = 0): number => Math.floor(Math.random() * (max - min) + min);

export const findMatchedTiming = <T extends { time: string }>(timings: T[], interval: number): T | null => {
  const now = toJapanDateTime(new Date());
  const executedTimeRounded = roundMinutes(now, interval, "floor");
  const time = dayjs(executedTimeRounded).format("HH:mm:ss");
  return timings.find(timing => timing.time === time);
};

export const getUsageProperty = (propertyUsages: PropertyUsage[], pagePropertyIds: string[], usageId: number) => {
  return propertyUsages.find(u => u.usage === usageId && pagePropertyIds.includes(u.appPropertyId));
};

export const setHistoriesForNewTodo = (
  assignees: User[],
  projects: Project[],
  startDate: Date,
  deadline: Date,
  isDone: boolean,
  isClosed: boolean,
  isDelayed: boolean,
): Omit<ITodoHistoryOption, "id">[] => {
  const args: Omit<ITodoHistoryOption, "id">[] = [];
  args.push({
    property: Property.NAME,
    action: Action.CREATE,
  });
  if (assignees?.length) {
    args.push({
      property: Property.ASSIGNEE,
      action: Action.CREATE,
      info: { userIds: assignees.map(u => u.id) },
    });
  }
  if (projects?.length) {
    args.push({
      property: Property.PROJECT,
      action: Action.CREATE,
      info: { projectIds: projects.map(p => p.id) },
    });
  }
  if (deadline) {
    args.push({
      property: Property.DEADLINE,
      action: Action.CREATE,
      info: { startDate, deadline },
    });
    if (isDelayed && !isDone && !isClosed) {
      args.push({
        property: Property.IS_DELAYED,
        action: Action.CREATE,
      });
    }
  }
  if (isDone) {
    args.push({
      property: Property.IS_DONE,
      action: Action.CREATE,
    });
  }
  if (isClosed) {
    args.push({
      property: Property.IS_CLOSED,
      action: Action.CREATE,
    });
  }
  return args;
};

export const setHistoriesForExistingTodo = async (
  oldTodo: Todo,
  name: string,
  assignees: User[],
  projects: Project[],
  startDate: Date,
  deadline: Date,
  isDone: boolean,
  isClosed: boolean,
  isDelayed: boolean,
): Promise<Omit<ITodoHistoryOption, "id">[]> => {
  const args: Omit<ITodoHistoryOption, "id">[] = [];
  const [latestDelayedHistory, latestRecoveredHistory] = await Promise.all([
    TodoHistoryRepository.getLatestDelayedHistory(oldTodo),
    TodoHistoryRepository.getLatestRecoveredHistory(oldTodo),
  ]);
  const daysDiff = oldTodo.deadline && deadline
    ? diffDays(toJapanDateTime(oldTodo.deadline), toJapanDateTime(deadline))
    : null;
  if (oldTodo.name !== name) {
    args.push({
      property: Property.NAME,
      action: Action.MODIFIED,
    });
  }
  if ((oldTodo.deadline || deadline) && daysDiff !== 0) {  // On deadline changed
    args.push({
      property: Property.DEADLINE,
      action: !oldTodo.deadline ? Action.CREATE : !deadline ? Action.DELETE : Action.MODIFIED,
      info: { startDate, deadline, daysDiff },
    });
    if (latestRecoveredHistory && latestRecoveredHistory.action === Action.CREATE) {
      args.push({
        property: Property.IS_RECOVERED,
        action: Action.DELETE,
      });
    }
  }
  const [deletedAssignees, addedAssignees] = extractDifferences(oldTodo.users, assignees, "id");
  const [deletedProjects, addedProjects] = extractDifferences(oldTodo.projects, projects, "id");
  if (addedAssignees.length) {
    args.push({
      property: Property.ASSIGNEE,
      action: Action.CREATE,
      info: { userIds: addedAssignees.map(u => u?.id).filter(id => id) },
    });
  }
  if (deletedAssignees.length) {
    args.push({
      property: Property.ASSIGNEE,
      action: Action.CREATE,
      info: { userIds: deletedAssignees.map(u => u?.id).filter(id => id) },
    });
  }
  if (addedProjects.length) {
    args.push({
      property: Property.PROJECT,
      action: Action.CREATE,
      info: { userIds: addedProjects.map(p => p?.id).filter(id => id) },
    });
  }
  if (deletedProjects.length) {
    args.push({
      property: Property.PROJECT,
      action: Action.CREATE,
      info: { userIds: deletedProjects.map(p => p?.id).filter(id => id) },
    });
  }
  if (oldTodo.isDone !== isDone) { // On marked as done
    args.push({
      property: Property.IS_DONE,
      action: isDone ? Action.CREATE : Action.DELETE,
    });
  }
  if (oldTodo.isClosed !== isClosed) { // On marked as closed
    args.push({
      property: Property.IS_CLOSED,
      action: isClosed ? Action.CREATE : Action.DELETE,
    });
  }
  if (isDelayed) {  // When ddl is before today
    if (!isDone && latestDelayedHistory && latestDelayedHistory.action !== Action.CREATE) {
      args.push({
        property: Property.IS_DELAYED,
        action: Action.CREATE,
      });
    }
  } else {  // When ddl is exactly or after today
    if (latestDelayedHistory && latestDelayedHistory.action !== Action.DELETE) {
      args.push({
        property: Property.IS_DELAYED,
        action: Action.DELETE,
      });
    }
    if (latestRecoveredHistory && latestRecoveredHistory.action !== Action.DELETE) {
      args.push({
        property: Property.IS_RECOVERED,
        action: Action.DELETE,
      });
    }
  }
  return args;
};

export const setHistoriesForNewProject = (
  assignees: User[],
  startDate: Date,
  deadline: Date,
  isDone: boolean,
  isClosed: boolean,
  isDelayed: boolean,
): Omit<IProjectHistoryOption, "id">[] => {
  const args: Omit<IProjectHistoryOption, "id">[] = [];
  args.push({
    property: Property.NAME,
    action: Action.CREATE,
  });
  if (assignees?.length) {
    args.push({
      property: Property.ASSIGNEE,
      action: Action.CREATE,
      info: { userIds: assignees.map(u => u.id) },
    });
  }
  if (deadline) {
    args.push({
      property: Property.DEADLINE,
      action: Action.CREATE,
      info: { startDate, deadline },
    });
    if (isDelayed && !isDone && !isClosed) {
      args.push({
        property: Property.IS_DELAYED,
        action: Action.CREATE,
      });
    }
  }
  if (isDone) {
    args.push({
      property: Property.IS_DONE,
      action: Action.CREATE,
    });
  }
  if (isClosed) {
    args.push({
      property: Property.IS_CLOSED,
      action: Action.CREATE,
    });
  }
  return args;
};

export const setHistoriesForExistingProject = async (
  oldProject: Project,
  name: string,
  assignees: User[],
  startDate: Date,
  deadline: Date,
  isDone: boolean,
  isClosed: boolean,
  isDelayed: boolean,
): Promise<Omit<IProjectHistoryOption, "id">[]> => {
  const args: Omit<IProjectHistoryOption, "id">[] = [];
  const [latestDelayedHistory, latestRecoveredHistory] = await Promise.all([
    ProjectHistoryRepository.getLatestDelayedHistory(oldProject),
    ProjectHistoryRepository.getLatestRecoveredHistory(oldProject),
  ]);
  const daysDiff = oldProject.deadline && deadline
    ? diffDays(toJapanDateTime(oldProject.deadline), toJapanDateTime(deadline))
    : null;
  if (oldProject.name !== name) {
    args.push({
      property: Property.NAME,
      action: Action.MODIFIED,
    });
  }
  if ((oldProject.deadline || deadline) && daysDiff !== 0) {  // On deadline changed
    args.push({
      property: Property.DEADLINE,
      action: !oldProject.deadline ? Action.CREATE : !deadline ? Action.DELETE : Action.MODIFIED,
      info: { startDate, deadline, daysDiff },
    });
    if (latestRecoveredHistory && latestRecoveredHistory.action === Action.CREATE) {
      args.push({
        property: Property.IS_RECOVERED,
        action: Action.DELETE,
      });
    }
  }
  const [deletedAssignees, addedAssignees] = extractDifferences(oldProject.users, assignees, "id");
  if (addedAssignees.length) {
    args.push({
      property: Property.ASSIGNEE,
      action: Action.CREATE,
      info: { userIds: addedAssignees.map(u => u?.id).filter(id => id) },
    });
  }
  if (deletedAssignees.length) {
    args.push({
      property: Property.ASSIGNEE,
      action: Action.CREATE,
      info: { userIds: deletedAssignees.map(u => u?.id).filter(id => id) },
    });
  }
  if (oldProject.isDone !== isDone) { // On marked as done
    args.push({
      property: Property.IS_DONE,
      action: isDone ? Action.CREATE : Action.DELETE,
    });
  }
  if (oldProject.isClosed !== isClosed) { // On marked as closed
    args.push({
      property: Property.IS_CLOSED,
      action: isClosed ? Action.CREATE : Action.DELETE,
    });
  }
  if (isDelayed) {  // When ddl is before today
    if (!isDone && latestDelayedHistory && latestDelayedHistory.action !== Action.CREATE) {
      args.push({
        property: Property.IS_DELAYED,
        action: Action.CREATE,
      });
    }
  } else {  // When ddl is exactly or after today
    if (latestDelayedHistory && latestDelayedHistory.action !== Action.DELETE) {
      args.push({
        property: Property.IS_DELAYED,
        action: Action.DELETE,
      });
    }
    if (latestRecoveredHistory && latestRecoveredHistory.action !== Action.DELETE) {
      args.push({
        property: Property.IS_RECOVERED,
        action: Action.DELETE,
      });
    }
  }
  return args;
};
