import { ITodo, IUser, ITodoUser, ITodoUserUpdate } from './../../types';
import { Service } from 'typedi';
import { Repository } from 'typeorm';
import { AppDataSource } from './../../config/data-source';
import { Todo } from './../../entify/todo.entity';
import { TodoUser } from './../../entify/todouser.entity';

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
    });

    const todoUserIds: number[] = todoUsers.map((s) => s.user_id).filter(Number);
    const userIds: number[] = users.map((s) => s.id).filter(Number);

    const differenceUserIds = todoUserIds
      .filter((x) => !userIds.includes(x))
      .concat(userIds.filter((x) => !todoUserIds.includes(x)));

    if (differenceUserIds.length) {
      const idTodoUsers: number[] = todoUsers
        .filter(function(obj) {
          return differenceUserIds.includes(obj.user_id);
        })
        .map((s) => s.id)
        .filter(Number);

      if (idTodoUsers.length) {
        await this.todoUserRepository.delete(idTodoUsers);
      }
    }
  };

  saveTodoUsers = async (dataTodoUsers: ITodoUserUpdate[]): Promise<void> => {
    //todo
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
          });

          const todoUserData = new TodoUser();
          todoUserData.id = todoUser?.id || null;
          todoUserData.todo_id = todo.id;
          todoUserData.user_id = user.id;
          todoUserDatas.push(todoUserData);
        }
      }
    }

    await this.todoUserRepository.upsert(todoUserDatas, []);
  };
}
