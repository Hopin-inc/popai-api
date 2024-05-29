
import StatusConfig from "@/entities/settings/StatusConfig";
import { prospects } from "@/consts/slack";
import Todo from "@/entities/transactions/Todo";
import { UserTodosReport } from "@/types/slack";
import { ProspectLevel } from "@/consts/common";
import User from "@/entities/settings/User";

const extractTextAndEmoji = (input: string) => {
  const [_, emoji = "", text = ""] = input.trim().match(/^(:[^:\s]+:)?\s*(.*)$/) || [];
  return { emoji, text };
};

export const getProspects = (statusConfig: StatusConfig) => {
  if (!statusConfig) return prospects;

  return prospects.map(prospect => {
    const levelKey = Object.keys(prospect).find(key => key.startsWith("level") && prospect[key]);
    if (levelKey) {
      const levelValue = statusConfig[levelKey];
      const { emoji, text } = extractTextAndEmoji(levelValue);
      return { ...prospect, text, emoji };
    }
    return prospect;
  });
};

export const mapTodosUserReport = (users: User[], todos: Todo[]) => {
  const userTodosMap = mapUserTodos(users, todos);
  const userTodosReport: UserTodosReport[] = [];

  if (userTodosMap.size) {
    for (const [userId, todos] of userTodosMap) {
      const user = users.find(user => user.id === userId);

      const tmpUserTodo: UserTodosReport = {
        user: user,
        response_time: 0,
        num_tasks_doing: todos.length,
        num_alert_tasks: 0,
        alert_todos: [],
      };

      let totalResponseTime = 0;
      let countTodoResponse = 0;

      for (const todo of todos) {
        if (!todo.prospects.length) continue;
        const responseTime = calculateResponseTime(todo);
        if (responseTime) {
          countTodoResponse++;
          totalResponseTime += responseTime;
        }
        if (
          todo.latestProspect?.prospectValue != null &&
          todo.latestProspect.prospectValue <= ProspectLevel.NEUTRAL
        ) {
          tmpUserTodo.num_alert_tasks += 1;
          tmpUserTodo.alert_todos.push(todo);
        }
      }

      if (countTodoResponse) {
        tmpUserTodo.response_time = Math.ceil(totalResponseTime / countTodoResponse);
      }
      userTodosReport.push(tmpUserTodo);
    }
  }

  return userTodosReport;
};

const calculateResponseTime = (todo: Todo): number => {
  const responseTimes: number[] = todo.prospects
    .filter(prospect => prospect.prospectRespondedAt !== null)
    .map(prospect => {
      const respondedAt = new Date(prospect.prospectRespondedAt).getTime();
      const createdAt = new Date(prospect.createdAt).getTime();
      return respondedAt - createdAt;
    });

  if (responseTimes.length === 0) return 0;

  const averageTime = responseTimes.reduce((total, time) => total + time, 0) / responseTimes.length;
  return averageTime / (1000 * 60 * 60);
};

const mapUserTodos = (users: User[], todos: Todo[]) => {
  const userTodosMap = new Map<string, Array<Todo>>();
  users.forEach(user => {
    userTodosMap.set(user.id, []);
    todos.forEach(todo => {
      if (todo.users.some(todoUser => todoUser?.id === user.id)) {
        userTodosMap.get(user.id).push(todo);
      }
    });
  });

  return userTodosMap;
};
