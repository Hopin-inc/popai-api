import dataSource from "@/config/data-source";
import ProjectUser from "@/entities/transactions/ProjectUser";
import User from "@/entities/settings/User";
import { saveRelationsInCrossRefTable, updateCrossRefTable } from "@/utils/repository";
import TodoUser from "@/entities/transactions/TodoUser";
import { IProjectUserUpdate } from "@/types";
import Project from "@/entities/transactions/Project";

export const ProjectUserRepository = dataSource.getRepository(ProjectUser).extend({
  async updateProjectUser(project: Project, users: User[]): Promise<void> {
    await updateCrossRefTable(this, TodoUser, project, users, "todoId", "userId");
  },

  async saveProjectUsers(dataProjectUsers: IProjectUserUpdate[]): Promise<void> {
    const data = dataProjectUsers.map(record => ({
      parentId: record.projectId,
      currentChildIds: record.currentUserIds,
      children: record.users,
    }));
    await saveRelationsInCrossRefTable(this, ProjectUser, data, "projectId", "userId");
  },
});
