import dataSource from "@/config/data-source";
import TodoUser from "@/entities/transactions/TodoUser";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";
import { extractArrayDifferences } from "@/utils/array";
import { In } from "typeorm";
import { ITodoUserUpdate } from "@/types";
import { TodoRepository } from "@/repositories/transactions/TodoRepository";

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
      const todo: Todo = await TodoRepository.findOneBy({
        appTodoId: dataTodoUser.todoId,
      });
      if (todo) {
        const savedTodoUsers = await this.find({
          where: { todo_id: todo.id },
          withDeleted: true,
        });
        const restoredUserIds: string[] = [];
        dataTodoUser.users.forEach(user => {
          if (!savedTodoUsers.some(tu => tu.user_id === user.id)) {
            if (savedTodoUsers.filter(ts => ts.deleted_at).some(ts => ts.user_id === user.id)) {
              restoredUserIds.push(user.id);
            } else {
              updatedTodoUsers.push(new TodoUser(todo, user));
            }
          }
        });
        savedTodoUsers.filter(tu => !tu.deleted_at).forEach(savedTodoUser => {
          if (!dataTodoUser.users.map(u => u.id).includes(savedTodoUser.user_id)) {
            deletedTodoUsers.push(savedTodoUser);
          }
        });
        await this.restore({
          todo_id: todo.id,
          user_id: In(restoredUserIds),
        });
      }
    }));
    await Promise.all([
      this.upsert(updatedTodoUsers, []),
      this.softRemove(deletedTodoUsers),
    ]);
  },

  async getUserAssignTask(usersCompany: User[], idMembers: string[]): Promise<User[]> {
    return usersCompany.filter(user => {
      return idMembers.filter(id => id === user.todoAppUser.appUserId).length;
    });
  },
});
