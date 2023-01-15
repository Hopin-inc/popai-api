import { AppDataSource } from "../config/data-source";
import { LoggerError } from "../exceptions";
import { Repository } from "typeorm";
import {
  ISection,
  ITodo,
  ITodoAppUser,
  ITodoTask,
  ITrelloAuth,
  IUser,
  ICompany,
  ITodoApp,
  ITodoUserUpdate,
  ITodoUpdate,
  IRemindTask,
  ITrelloTask,
  ITodoSectionUpdate,
  ITrelloMember,
} from "../types";
import { Service, Container } from "typedi";
import { Todo } from "../entify/todo.entity";
import { TodoAppUser } from "../entify/todoappuser.entity";
import { toJapanDateTime, diffDays } from "../utils/common";
import moment from "moment";
import logger from "../logger/winston";
import TrelloRequest from "../libs/trello.request";
import TodoUserRepository from "./modules/todoUser.repository";
import TodoUpdateRepository from "./modules/todoUpdate.repository";
import CommonRepository from "./modules/common.repository";
import LineQuequeRepository from "./modules/line_queque.repository";
import TodoSectionRepository from "./modules/todo.section.repository";

@Service()
export default class TrelloRepository {
  private trelloRequest: TrelloRequest;
  private todoRepository: Repository<Todo>;
  private todoUpdateRepository: TodoUpdateRepository;
  private lineQueueRepository: LineQuequeRepository;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private todoUserRepository: TodoUserRepository;
  private todoSectionRepository: TodoSectionRepository;
  private commonRepository: CommonRepository;

  constructor() {
    this.trelloRequest = Container.get(TrelloRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = Container.get(TodoUpdateRepository);
    this.lineQueueRepository = Container.get(LineQuequeRepository);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.todoUserRepository = Container.get(TodoUserRepository);
    this.todoSectionRepository = Container.get(TodoSectionRepository);
    this.commonRepository = Container.get(CommonRepository);
  }

  syncTaskByUserBoards = async (company: ICompany, todoapp: ITodoApp): Promise<void> => {
    const companyId = company.id;
    const todoappId = todoapp.id;

    await this.updateUsersTrello(company.users, todoappId);
    const sections = await this.commonRepository.getSections(companyId, todoappId);

    await this.getUserCardBoards(sections, company, todoapp);
  };

  getUserCardBoards = async (
    sections: ISection[],
    company: ICompany,
    todoapp: ITodoApp,
  ): Promise<void> => {
    try {
      const todoTasks: ITodoTask<ITrelloTask>[] = [];

      for (const section of sections) {
        await this.getCardBoards(section.boardAdminUser, section, todoTasks, company, todoapp);
      }
      console.log(`[${ company.name } - ${ todoapp.name }] getCardBoards: ${ todoTasks.length }`);

      const dayReminds: number[] = await this.commonRepository.getDayReminds(company.companyConditions);

      await this.filterUpdateCards(dayReminds, todoTasks);
      console.log(`[${ company.name } - ${ todoapp.name }] filterUpdateCards: ${ dayReminds }`);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getCardBoards = async (
    boardAdminuser: IUser,
    section: ISection,
    todoTasks: ITodoTask<ITrelloTask>[],
    company: ICompany,
    todoapp: ITodoApp,
  ): Promise<void> => {
    if (!boardAdminuser?.todoAppUsers.length) return;

    for (const todoAppUser of boardAdminuser.todoAppUsers) {
      if (todoAppUser.api_key && todoAppUser.api_token && section.board_id) {
        try {
          const trelloAuth: ITrelloAuth = {
            api_key: todoAppUser.api_key,
            api_token: todoAppUser.api_token,
          };
          const cardTodos = await this.trelloRequest.fetchApi<{}, ITrelloTask[]>(
            "boards/" + section.board_id + "/cards/all",
            "GET",
            {},
            trelloAuth,
          );
          await Promise.all(cardTodos.map(todoTask => {
            return this.addTodoTask(todoTask, boardAdminuser, section, todoTasks, company, todoapp, todoAppUser);
          }));
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  };

  addTodoTask = async (
    todoTask: ITrelloTask,
    boardAdminuser: IUser,
    section: ISection,
    todoTasks: ITodoTask<ITrelloTask>[],
    company: ICompany,
    todoapp: ITodoApp,
    todoAppUser: ITodoAppUser
  ): Promise<void> => {
    const users = await this.todoUserRepository.getUserAssignTask(
      company.users,
      todoTask.idMembers,
    );

    const card: ITodoTask<ITrelloTask> = {
      todoTask: todoTask,
      company: company,
      todoapp: todoapp,
      todoAppUser: todoAppUser,
      sections: [section],  // TODO: ラベルで複数sectionsを指定できるようにする
      users: users,
    };

    const taskFound = todoTasks.find((task) => task.todoTask?.id === todoTask.id);
    if (taskFound) {
      taskFound.users = users;
    } else {
      todoTasks.push(card);
    }
  }

  updateUsersTrello = async (usersCompany: IUser[], todoappId: number): Promise<void> => {
    const users = usersCompany.filter((user) => {
      return user?.todoAppUsers.find(
        (todoAppUser) => todoAppUser.todoapp_id === todoappId && !todoAppUser.user_app_id,
      );
    });

    for await (const user of users) {
      if (user.todoAppUsers.length) {
        await this.updateTrelloUser(user.todoAppUsers);
      }
    }
  };

  updateTrelloUser = async (todoAppUsers: ITodoAppUser[]): Promise<any> => {
    for (const todoAppUser of todoAppUsers) {
      if (todoAppUser.api_key && todoAppUser.api_token) {
        try {
          const trelloAuth: ITrelloAuth = {
            api_key: todoAppUser.api_key,
            api_token: todoAppUser.api_token,
          };

          const me = await this.trelloRequest.fetchApi<{}, ITrelloMember>("members/me", "GET", {}, trelloAuth);
          todoAppUser.user_app_id = me?.id;
          await this.todoAppUserRepository.save(todoAppUser);
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  };

  filterUpdateCards = async (dayReminds: number[], cardTodos: ITodoTask<ITrelloTask>[]): Promise<void> => {
    const cards: IRemindTask<ITrelloTask>[] = [];

    for (const cardTodo of cardTodos) {
      let delayedCount = 0;
      let dayDurations;
      const todoTask = cardTodo.todoTask;

      if (todoTask.due) {
        dayDurations = diffDays(toJapanDateTime(todoTask.due), toJapanDateTime(new Date()));
        delayedCount = dayDurations;
      }

      cards.push({
        remindDays: dayDurations,
        cardTodo: cardTodo,
        delayedCount: delayedCount,
      });
    }

    await this.createTodo(cards);
  };

  createTodo = async (taskReminds: IRemindTask<ITrelloTask>[]): Promise<void> => {
    try {
      if (!taskReminds.length) return;
      const dataTodos: Todo[] = [];
      const dataTodoUpdates: ITodoUpdate[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];
      const dataTodoSections: ITodoSectionUpdate[] = [];

      await Promise.all(taskReminds.map(taskRemind => {
        return this.addDataTodo(taskRemind, dataTodos, dataTodoUpdates, dataTodoUsers, dataTodoSections);
      }));

      const response = await this.todoRepository.upsert(dataTodos, []);

      if (response) {
        await Promise.all([
          this.todoUpdateRepository.saveTodoHistories(dataTodoUpdates),
          this.todoUserRepository.saveTodoUsers(dataTodoUsers),
          this.todoSectionRepository.saveTodoSections(dataTodoSections),
          // await this.lineQueueRepository.pushTodoLineQueues(dataLineQueues),
        ]);
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  addDataTodo = async (
    taskRemind: IRemindTask<ITrelloTask>,
    dataTodos: Todo[],
    dataTodoUpdates: ITodoUpdate[],
    dataTodoUsers: ITodoUserUpdate[],
    dataTodoSections: ITodoSectionUpdate[],
  ): Promise<void> => {
    const cardTodo = taskRemind.cardTodo;
    const { users, todoTask, todoapp, company, sections } = cardTodo;

    const todo: ITodo = await this.todoRepository.findOneBy({
      todoapp_reg_id: todoTask.id,
    });

    const taskDeadLine = todoTask.due ? toJapanDateTime(todoTask.due) : null;
    const taskUpdated = toJapanDateTime(todoTask.dateLastActivity);

    const todoData = new Todo();
    todoData.id = todo?.id || null;
    todoData.name = todoTask.name;
    todoData.todoapp_id = todoapp.id;
    todoData.todoapp_reg_id = todoTask.id;
    todoData.todoapp_reg_url = todoTask.shortUrl;
    todoData.todoapp_reg_created_by = null; // TODO: 取得する
    todoData.todoapp_reg_created_at = todo?.todoapp_reg_created_at || taskUpdated;
    todoData.company_id = company.id;
    todoData.deadline = taskDeadLine;
    todoData.is_done = todoTask.dueComplete;
    todoData.is_reminded = !!todoTask.dueReminder;
    todoData.is_closed = todoTask.closed;
    todoData.delayed_count = todo?.delayed_count || 0;
    todoData.reminded_count = todo?.reminded_count || 0;

    //set first update task
    if (taskDeadLine) {
      todoData.first_ddl_set_at = todo?.first_ddl_set_at || taskUpdated;
    }

    if (sections.length) {
      dataTodoSections.push({ todoId: todoTask.id, sections })
    }

    if (users.length) {
      //set first update task
      todoData.first_assigned_at = todo?.first_assigned_at || taskUpdated;
      dataTodoUsers.push({ todoId: todoTask.id, users });
    }

    //update deadline task
    if (taskDeadLine || todoData.is_done) {
      const isDeadlineChanged = !moment(taskDeadLine).isSame(todo?.deadline);
      const isDoneChanged = todo?.is_done !== todoData.is_done;

      if (isDeadlineChanged || isDoneChanged) {
        dataTodoUpdates.push({
          todoId: todoTask.id,
          dueTime: todo?.deadline,
          newDueTime: taskDeadLine,
          updateTime: toJapanDateTime(todoTask.dateLastActivity),
        });
      }

      if (
        !todoData.is_done &&
        taskRemind.delayedCount > 0 &&
        (isDeadlineChanged || !todoData.delayed_count)
      ) {
        todoData.delayed_count = todoData.delayed_count + 1;
      }
    }

    dataTodos.push(todoData);

    // update user
    if (todo) {
      await this.todoUserRepository.updateTodoUser(todo, users);
      await this.todoSectionRepository.updateTodoSection(todo, sections);
    }
  };
}
