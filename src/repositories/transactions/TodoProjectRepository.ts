import dataSource from "@/config/data-source";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";
import { ITodoProjectUpdate } from "@/types";
import TodoProject from "@/entities/transactions/TodoProject";
import Project from "@/entities/transactions/Project";
import { updateCrossRefTable, saveRelationsInCrossRefTable } from "@/utils/repository";

export const TodoProjectRepository = dataSource.getRepository(TodoProject).extend({
  async updateTodoProject(todo: Todo, projects: Project[]): Promise<void> {
    await updateCrossRefTable(this, TodoProject, todo, projects, "todoId", "projectId");
  },

  async saveTodoProjects(dataTodoProjects: ITodoProjectUpdate[]): Promise<void> {
    const data = dataTodoProjects.map(record => ({
      parentId: record.todoId,
      currentChildIds: record.currentProjectIds,
      children: record.projects,
    }));
    await saveRelationsInCrossRefTable(this, TodoProject, data, "todoId", "projectId");
  },

  async getUserAssignTask(usersCompany: User[], idMembers: string[]): Promise<User[]> {
    return usersCompany.filter(user => {
      return idMembers.filter(id => id === user.todoAppUser.appUserId).length;
    });
  },
});
