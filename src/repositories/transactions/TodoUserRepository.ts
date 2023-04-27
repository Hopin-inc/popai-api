import dataSource from "@/config/data-source";
import TodoUser from "@/entities/transactions/TodoUser";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";
import { extractArrayDifferences } from "@/utils/array";
import { In } from "typeorm";
import { ITodoUserUpdate } from "@/types";

export const TodoUserRepository = dataSource.getRepository<TodoUser>(TodoUser).extend({
  async updateTodoUser(todo: Todo, users: User[]): Promise<void> {
    const todoUsers: TodoUser[] = await this.find({
      where: { todo_id: todo.id },
      withDeleted: true,
    });

    const userIdsBefore: string[] = todoUsers.filter(tu => !tu.deletedAt).map(tu => tu.userId);
    const userIdsAfter: string[] = users.map(user => user.id);
    const [addedUserIds, deletedUserIds] = extractArrayDifferences(userIdsAfter, userIdsBefore);

    const addedTodoUsers: TodoUser[] = [];
    const restoredUserIds: string[] = [];
    const deletedTodoUsers = todoUsers.filter(tu => deletedUserIds.includes(tu.userId));
    addedUserIds.forEach(userId => {
      if (todoUsers.filter(tu => tu.deletedAt).map(tu => tu.userId).includes(userId)) {
        restoredUserIds.push(userId);
      } else {
        addedTodoUsers.push(new TodoUser(todo, userId));
      }
    });
    await Promise.all([
      this.upsert(addedTodoUsers, []),
      this.restore({
        todo_id: todo.id,
        user_id: In(restoredUserIds),
      }),
      this.softRemove(deletedTodoUsers),
    ]);
  },

  async saveTodoUsers(dataTodoUsers: ITodoUserUpdate[]): Promise<void> {
    const updatedTodoUsers: TodoUser[] = [];
    const deletedTodoUsers: TodoUser[] = [];
    await Promise.all(dataTodoUsers.map(async dataTodoUser => {
      const { todoId, users, currentUserIds } = dataTodoUser;
      users.forEach(user => {
        const todoUser = new TodoUser(todoId, user);
        todoUser.deletedAt = null;
        updatedTodoUsers.push(todoUser);
      });
      currentUserIds.forEach(userId => {
        if (!users.map(u => u.id).includes(userId)) {
          deletedTodoUsers.push(new TodoUser(todoId, userId));
        }
      });
    }));
    await Promise.all([
      this.upsert(updatedTodoUsers, ["todoId", "userId"]),
      this.softRemove(deletedTodoUsers),
    ]);
  },

  async getUserAssignTask(usersCompany: User[], idMembers: string[]): Promise<User[]> {
    return usersCompany.filter(user => {
      return idMembers.filter(id => id === user.todoAppUser.appUserId).length;
    });
  },
});
