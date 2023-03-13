import { Service } from "typedi";
import { In, Repository } from "typeorm";

import Todo from "@/entities/transactions/Todo";
import TodoUser from "@/entities/transactions/TodoUser";
import User from "@/entities/settings/User";

import AppDataSource from "@/config/data-source";
import { extractArrayDifferences } from "@/utils/common";
import { ITodoUserUpdate } from "@/types";
import { TodoRepository } from "@/repositories/TodoRepository";

@Service()
export default class TodoUserRepository {
  private todoUserRepository: Repository<TodoUser>;

  constructor() {
    this.todoUserRepository = AppDataSource.getRepository(TodoUser);
  }

  public async updateTodoUser(todo: Todo, users: User[]): Promise<void> {
    const todoUsers: TodoUser[] = await this.todoUserRepository.find({
      where: { todo_id: todo.id },
      withDeleted: true,
    });

    const userIdsBefore: number[] = todoUsers.filter(tu => !tu.deleted_at).map(tu => tu.user_id);
    const userIdsAfter: number[] = users.map(user => user.id);
    const [addedUserIds, deletedUserIds] = extractArrayDifferences(userIdsAfter, userIdsBefore);

    const addedTodoUsers: TodoUser[] = [];
    const restoredUserIds: number[] = [];
    const deletedTodoUsers = todoUsers.filter(tu => deletedUserIds.includes(tu.user_id));
    addedUserIds.forEach(userId => {
      if (todoUsers.filter(tu => tu.deleted_at).map(tu => tu.user_id).includes(userId)) {
        restoredUserIds.push(userId);
      } else {
        addedTodoUsers.push(new TodoUser(todo, userId));
      }
    });
    await Promise.all([
      this.todoUserRepository.upsert(addedTodoUsers, []),
      this.todoUserRepository.restore({
        todo_id: todo.id,
        user_id: In(restoredUserIds),
      }),
      this.todoUserRepository.softRemove(deletedTodoUsers),
    ]);
  }

  public async saveTodoUsers(dataTodoUsers: ITodoUserUpdate[]): Promise<void> {
    const updatedTodoUsers: TodoUser[] = [];
    const deletedTodoUsers: TodoUser[] = [];
    await Promise.all(dataTodoUsers.map(async dataTodoUser => {
      const todo: Todo = await TodoRepository.findOneBy({
        todoapp_reg_id: dataTodoUser.todoId,
      });
      if (todo) {
        const savedTodoUsers = await this.todoUserRepository.find({
          where: { todo_id: todo.id },
          withDeleted: true,
        });
        const restoredUserIds: number[] = [];
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
        await this.todoUserRepository.restore({
          todo_id: todo.id,
          user_id: In(restoredUserIds),
        });
      }
    }));
    await Promise.all([
      this.todoUserRepository.upsert(updatedTodoUsers, []),
      this.todoUserRepository.softRemove(deletedTodoUsers),
    ]);
  }

  public async getUserAssignTask(usersCompany: User[], idMembers: string[]): Promise<User[]> {
    return usersCompany.filter((user) => {
      const userLineIds = user?.todoAppUsers.reduce(function(userAppIds: string[], todoAppUser) {
        userAppIds.push(todoAppUser.user_app_id);
        return userAppIds;
      }, []);

      return idMembers.filter((value) => userLineIds.includes(value)).length;
    });
  }
}
