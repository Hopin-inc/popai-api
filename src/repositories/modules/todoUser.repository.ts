import { ITodo, ITodoUser, ITodoUserUpdate, IUser } from "../../types";
import { Service } from "typedi";
import { IsNull, Repository } from "typeorm";
import { AppDataSource } from "../../config/data-source";
import { Todo } from "../../entify/todo.entity";
import { TodoUser } from "../../entify/todouser.entity";
import { toJapanDateTime } from "../../utils/common";

@Service()
export default class TodoUserRepository {
  private todoUserRepository: Repository<TodoUser>;
  private todoRepository: Repository<Todo>;

  constructor() {
    this.todoUserRepository = AppDataSource.getRepository(TodoUser);
    this.todoRepository = AppDataSource.getRepository(Todo);
  }

  updateTodoUser = async (todo: ITodo, users: IUser[]): Promise<void> => {
    const todoUsers: ITodoUser[] = await this.todoUserRepository.findBy({
      todo_id: todo.id,
      deleted_at: IsNull(),
    });

    const todoUserIds: number[] = todoUsers.map((s) => s.user_id).filter(Number);
    const userIds: number[] = users.map((s) => s.id).filter(Number);

    const differenceUserIds = todoUserIds
      .filter((x) => !userIds.includes(x))
      .concat(userIds.filter((x) => !todoUserIds.includes(x)));

    if (differenceUserIds.length) {
      const deletedTodoUsers: ITodoUser[] = todoUsers
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
  };

  saveTodoUsers = async (dataTodoUsers: ITodoUserUpdate[]): Promise<void> => {
    const todoUserDatas = [];

    for await (const dataTodoUser of dataTodoUsers) {
      const todo: ITodo = await this.todoRepository.findOneBy({
        todoapp_reg_id: dataTodoUser.todoId,
      });

      if (todo) {
        for (const user of dataTodoUser.users) {
          const todoUser: ITodoUser = await this.todoUserRepository.findOneBy({
            todo_id: todo.id,
            user_id: user.id,
            deleted_at: IsNull(),
          });

          if (!todoUser) {
            const todoUserData = new TodoUser();
            todoUserData.todo_id = todo.id;
            todoUserData.user_id = user.id;
            todoUserData.created_at = toJapanDateTime(new Date());

            todoUserDatas.push(todoUserData);
          }
        }
      }
    }

    await this.todoUserRepository.save(todoUserDatas);
  };

  getUserAssignTask = async (usersCompany: IUser[], idMembers: string[]): Promise<IUser[]> => {
    return usersCompany.filter((user) => {
      const userLineIds = user?.todoAppUsers.reduce(function(userAppIds: string[], todoAppUser) {
        userAppIds.push(todoAppUser.user_app_id);
        return userAppIds;
      }, []);

      return idMembers.filter((value) => userLineIds.includes(value)).length;
    });
  };
}
