import { Service } from "typedi";
import { In, IsNull, Repository } from "typeorm";

import Todo from "@/entities/transactions/Todo";
import TodoUser from "@/entities/transactions/TodoUser";
import User from "@/entities/settings/User";

import AppDataSource from "@/config/data-source";
import { toJapanDateTime } from "@/utils/common";
import { ITodoUserUpdate } from "@/types";

@Service()
export default class TodoUserRepository {
  private todoUserRepository: Repository<TodoUser>;
  private todoRepository: Repository<Todo>;

  constructor() {
    this.todoUserRepository = AppDataSource.getRepository(TodoUser);
    this.todoRepository = AppDataSource.getRepository(Todo);
  }

  public async updateTodoUser(todo: Todo, users: User[]): Promise<void> {
    const todoUsers: TodoUser[] = await this.todoUserRepository.findBy({
      todo_id: todo.id,
      deleted_at: IsNull(),
    });

    const todoUserIds: number[] = todoUsers.map((s) => s.user_id);
    const userIds: number[] = users.map(user => user.id);

    const differenceUserIds = todoUserIds
      .filter(id => !userIds.includes(id))
      .concat(userIds.filter(id => !todoUserIds.includes(id)));

    if (differenceUserIds.length) {
      const deletedTodoUsers: TodoUser[] = todoUsers
        .filter(todoUser => differenceUserIds.includes(todoUser.user_id))
        .map(todoUser => {
          todoUser.deleted_at = toJapanDateTime(new Date());
          return todoUser;
        });

      if (deletedTodoUsers.length) {
        await this.todoUserRepository.upsert(deletedTodoUsers, []);
      }
    }
  }

  public async saveTodoUsers(dataTodoUsers: ITodoUserUpdate[]): Promise<void> {
    const updatedTodoUsers: TodoUser[] = [];
    await Promise.all(dataTodoUsers.map(async dataTodoUser => {
      const todo: Todo = await this.todoRepository.findOneBy({
        todoapp_reg_id: dataTodoUser.todoId,
      });
      if (todo) {
        const savedTodoUsers = await this.todoUserRepository.findBy({
          todo_id: todo.id,
          user_id: In(dataTodoUser.users.map(user => user.id)),
          deleted_at: IsNull(),
        });
        dataTodoUser.users.forEach(user => {
          if (!savedTodoUsers.some(tu => tu.user_id === user.id)) {
            const todoUser = new TodoUser();
            todoUser.todo_id = todo.id;
            todoUser.user_id = user.id;
            updatedTodoUsers.push(todoUser);
          }
        });
        savedTodoUsers.forEach(savedTodoUser => {
          if (!dataTodoUser.users.map(u => u.id).includes(savedTodoUser.user_id)) {
            updatedTodoUsers.push({ ...savedTodoUser, deleted_at: toJapanDateTime(new Date()) });
          }
        });
      }
    }));
    await this.todoUserRepository.save(updatedTodoUsers);
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
