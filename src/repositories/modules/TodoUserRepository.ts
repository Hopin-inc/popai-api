import { Service } from "typedi";
import { IsNull, Repository } from "typeorm";

import Todo from "@/entities/Todo";
import TodoUser from "@/entities/TodoUser";
import User from "@/entities/User";

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

    const todoUserIds: number[] = todoUsers.map((s) => s.user_id).filter(Number);
    const userIds: number[] = users.map((s) => s.id).filter(Number);

    const differenceUserIds = todoUserIds
      .filter((x) => !userIds.includes(x))
      .concat(userIds.filter((x) => !todoUserIds.includes(x)));

    if (differenceUserIds.length) {
      const deletedTodoUsers: TodoUser[] = todoUsers
        .filter(function(obj) {
          return differenceUserIds.includes(obj.user_id);
        })
        .map((s) => {
          s.deleted_at = toJapanDateTime(new Date());
          return s;
        });

      if (deletedTodoUsers.length) {
        // await this.todoUserRepository.delete(idTodoUsers);
        await this.todoUserRepository.upsert(deletedTodoUsers, []);
      }
    }
  }

  public async saveTodoUsers(dataTodoUsers: ITodoUserUpdate[]): Promise<void> {
    const todoUsers: TodoUser[] = [];

    for await (const dataTodoUser of dataTodoUsers) {
      const todo: Todo = await this.todoRepository.findOneBy({
        todoapp_reg_id: dataTodoUser.todoId,
      });

      if (todo) {
        for (const user of dataTodoUser.users) {
          const todoUser: TodoUser = await this.todoUserRepository.findOneBy({
            todo_id: todo.id,
            user_id: user.id,
            deleted_at: IsNull(),
          });

          if (!todoUser) {
            const todoUser = new TodoUser();
            todoUser.todo_id = todo.id;
            todoUser.user_id = user.id;
            todoUsers.push(todoUser);
          }
        }
      }
    }

    await this.todoUserRepository.save(todoUsers);
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
