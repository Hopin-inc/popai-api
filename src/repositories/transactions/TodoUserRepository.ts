import dataSource from "@/config/data-source";
import TodoUser from "@/entities/transactions/TodoUser";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";
import { ITodoUserUpdate } from "@/types";
import { saveRelationsInCrossRefTable, updateCrossRefTable } from "@/utils/repository";

export const TodoUserRepository = dataSource.getRepository<TodoUser>(TodoUser).extend({
  async updateTodoUser(todo: Todo, users: User[]): Promise<void> {
    await updateCrossRefTable(this, TodoUser, todo, users, "todoId", "userId");
  },

  async saveTodoUsers(dataTodoUsers: ITodoUserUpdate[]): Promise<void> {
    const data = dataTodoUsers.map(record => ({
      parentId: record.todoId,
      currentChildIds: record.currentUserIds,
      children: record.users,
    }));
    await saveRelationsInCrossRefTable(this, TodoUser, data, "todoId", "userId");
  },

  async getUserAssignTask(usersCompany: User[], idMembers: string[]): Promise<User[]> {
    return usersCompany.filter(user => {
      return idMembers.filter(id => id === user.todoAppUser.appUserId).length;
    });
  },
});
