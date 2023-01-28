import { LoggerError } from "@/exceptions";
import { Repository } from "typeorm";
import { Service, Container } from "typedi";
import moment from "moment";
import FormData from "form-data";

import ImplementedTodoApp from "@/entities/ImplementedTodoApp";
import TodoAppUser from "@/entities/TodoAppUser";
import Todo from "@/entities/Todo";

import LineMessageQueueRepository from "./modules/LineMessageQueueRepository";
import TodoUserRepository from "./modules/TodoUserRepository";
import TodoUpdateHistoryRepository from "./modules/TodoUpdateHistoryRepository";
import CommonRepository from "./modules/CommonRepository";
import TodoSectionRepository from "./modules/TodoSectionRepository";

import { replaceString, toJapanDateTime, diffDays } from "@/utils/common";
import MicrosoftRequest from "@/services/MicrosoftRequest";
import logger from "@/logger/winston";
import { fetchApi } from "@/libs/request";
import AppDataSource from "@/config/data-source";
import {
  ICompany,
  IRemindTask,
  ISection,
  ITodo,
  ITodoApp,
  ITodoAppUser,
  ITodoSectionUpdate,
  ITodoTask,
  ITodoUpdate,
  ITodoUserUpdate,
  IUser,
} from "@/types";
import { IMicrosoftRefresh, IMicrosoftTask, IMicrosoftToken } from "@/types/microsoft";
import { COMPLETED, MICROSOFT_BASE_URL } from "@/consts/microsoft";

@Service()
export default class MicrosoftRepository {
  private todoAppUserRepository: Repository<TodoAppUser>;
  private microsoftRequest: MicrosoftRequest;
  private todoRepository: Repository<Todo>;
  private todoUpdateRepository: TodoUpdateHistoryRepository;
  private lineQueueRepository: LineMessageQueueRepository;
  private todoUserRepository: TodoUserRepository;
  private todoSectionRepository: TodoSectionRepository;
  private commonRepository: CommonRepository;

  constructor() {
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.microsoftRequest = Container.get(MicrosoftRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = Container.get(TodoUpdateHistoryRepository);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
    this.todoUserRepository = Container.get(TodoUserRepository);
    this.todoSectionRepository = Container.get(TodoSectionRepository);
    this.commonRepository = Container.get(CommonRepository);
  }

  syncTaskByUserBoards = async (company: ICompany, todoapp: ITodoApp): Promise<void> => {
    const companyId = company.id;
    const todoappId = todoapp.id;

    await this.updateUsersMicrosoft(company.users, todoappId);
    const sections = await this.commonRepository.getSections(companyId, todoappId);
    await this.getUserTaskBoards(sections, company, todoapp);
  };

  getUserTaskBoards = async (
    sections: ISection[],
    company: ICompany,
    todoapp: ITodoApp
  ): Promise<void> => {
    try {
      const todoTasks: ITodoTask<IMicrosoftTask>[] = [];

      for (const section of sections) {
        await this.getTaskBoards(section.boardAdminUser, section, todoTasks, company, todoapp);
      }
      console.log(`[${ company.name } - ${ todoapp.name }] getCardBoards: ${ todoTasks.length }`);

      const dayReminds: number[] = await this.commonRepository.getDayReminds(company.companyConditions);
      const implementedTodoApp = await this.commonRepository.getImplementTodoApp(company.id, todoapp.id);
      if (implementedTodoApp) {
        await this.filterUpdateTask(dayReminds, todoTasks, implementedTodoApp);
      }
      console.log(`[${ company.name } - ${ todoapp.name }] filterUpdateTask: ${ dayReminds }`);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getTaskBoards = async (
    boardAdminuser: IUser,
    section: ISection,
    todoTasks: ITodoTask<IMicrosoftTask>[],
    company: ICompany,
    todoapp: ITodoApp
  ): Promise<void> => {
    if (!boardAdminuser?.todoAppUsers.length) return;

    for (const todoAppUser of boardAdminuser.todoAppUsers) {
      if (todoAppUser.api_token && section.board_id) {
        try {
          const dataRefresh: IMicrosoftRefresh = { todoAppUser };
          const taskTodos = await this.microsoftRequest.getAllTasksFromPlan(section.board_id, dataRefresh);

          const tasks = taskTodos["value"];
          if (tasks && tasks.length) {
            await Promise.all(tasks.map(todoTask => {
              return this.addTodoTask(todoTask, boardAdminuser, section, todoTasks, company, todoapp, todoAppUser);
            }));
          }
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  };

  addTodoTask = async (
    todoTask: IMicrosoftTask,
    boardAdminuser: IUser,
    section: ISection,
    todoTasks: ITodoTask<IMicrosoftTask>[],
    company: ICompany,
    todoapp: ITodoApp,
    todoAppUser: ITodoAppUser
  ): Promise<void> => {
    let userCreateBy = null;
    if (todoTask.createdBy) {
      const userCreates = await this.todoUserRepository.getUserAssignTask(company.users, [
        todoTask.createdBy?.user?.id,
      ]);

      if (userCreates.length) {
        userCreateBy = userCreates.shift().id;
      }
    }

    const userAssigns = Object.keys(todoTask.assignments);
    const users = await this.todoUserRepository.getUserAssignTask(
      company.users,
      userAssigns
    );

    const card: ITodoTask<IMicrosoftTask> = {
      todoTask: { ...todoTask, userCreateBy: userCreateBy },
      company: company,
      todoapp: todoapp,
      todoAppUser: todoAppUser,
      sections: [section],
      users: users,
    };

    const taskFound = todoTasks.find((task) => task.todoTask?.id === todoTask.id);

    if (taskFound) {
      taskFound.users = users;
    } else {
      todoTasks.push(card);
    }
  };

  updateUsersMicrosoft = async (usersCompany: IUser[], todoappId: number): Promise<void> => {
    const users = usersCompany.filter((user) => {
      return user?.todoAppUsers.find(
        (todoAppUser) => todoAppUser.todoapp_id === todoappId && !todoAppUser.user_app_id
      );
    });

    for (const user of users) {
      if (user.todoAppUsers.length) {
        await this.updateMicosoftUser(user.todoAppUsers);
      }
    }
  };

  updateMicosoftUser = async (todoAppUsers: ITodoAppUser[]): Promise<any> => {
    for (const todoAppUser of todoAppUsers) {
      if (todoAppUser.api_token) {
        try {
          const dataRefresh: IMicrosoftRefresh = { todoAppUser };
          const me = await this.microsoftRequest.getMyInfo(dataRefresh);
          todoAppUser.user_app_id = me?.id;
          await this.todoAppUserRepository.save(todoAppUser);
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  };

  refreshToken = async (dataRefresh: IMicrosoftRefresh): Promise<ITodoAppUser | null> => {
    try {
      const { todoAppUser } = dataRefresh;
      const todoAppUserData = todoAppUser;
      const clientId = process.env.MICROSOFT_CLIENT_ID;
      const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;

      if (clientId && clientSecret && todoAppUserData.refresh_token) {
        const url = "https://login.microsoftonline.com/common/oauth2/v2.0/token";

        const formData = new FormData();
        formData.append("client_id", clientId);
        formData.append("scope", "https://graph.microsoft.com/.default");
        formData.append("refresh_token", todoAppUserData.refresh_token);
        formData.append("grant_type", "refresh_token");
        formData.append("client_secret", clientSecret);

        const response = await fetchApi<FormData, IMicrosoftToken>(url, "POST", formData, true);

        if (response.access_token) {
          const todoAppUser: ITodoAppUser = await this.todoAppUserRepository.findOneBy({
            todoapp_id: todoAppUserData.todoapp_id,
            employee_id: todoAppUserData.employee_id,
          });

          if (todoAppUser) {
            todoAppUser.api_token = response.access_token;
            todoAppUser.refresh_token = response.refresh_token;
            todoAppUser.expires_in = response.expires_in;
            return await this.todoAppUserRepository.save(todoAppUser);
          }
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }

    return null;
  };

  filterUpdateTask = async (
    dayReminds: number[],
    todoTaskLists: ITodoTask<IMicrosoftTask>[],
    implementTodoApp: ImplementedTodoApp
  ): Promise<void> => {
    const tasks: IRemindTask<IMicrosoftTask>[] = [];

    for (const cardTodo of todoTaskLists) {
      const todoTask = cardTodo.todoTask;
      let dayDurations;
      let delayedCount = 0;

      if (todoTask.dueDateTime) {
        dayDurations = diffDays(toJapanDateTime(todoTask.dueDateTime), toJapanDateTime(new Date()));
        delayedCount = dayDurations;
      }

      tasks.push({
        remindDays: dayDurations,
        cardTodo: cardTodo,
        delayedCount: delayedCount,
      });
    }

    await this.createTodo(tasks, implementTodoApp);
  };

  createTodo = async (
    taskReminds: IRemindTask<IMicrosoftTask>[],
    implementedTodoApp: ImplementedTodoApp
  ): Promise<void> => {
    try {
      if (!taskReminds.length) return;

      const dataTodos: Todo[] = [];
      const dataTodoUpdates: ITodoUpdate[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];
      const dataTodoSections: ITodoSectionUpdate[] = [];

      await Promise.all(taskReminds.map(taskRemind => {
        return this.addDataTodo(
          taskRemind,
          dataTodos,
          dataTodoUpdates,
          dataTodoUsers,
          dataTodoSections,
          implementedTodoApp.primary_domain
        );
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
    taskRemind: IRemindTask<IMicrosoftTask>,
    dataTodos: Todo[],
    dataTodoUpdates: ITodoUpdate[],
    dataTodoUsers: ITodoUserUpdate[],
    dataTodoSections: ITodoSectionUpdate[],
    primaryDomain: string,
  ): Promise<void> => {
    const cardTodo = taskRemind.cardTodo;
    const { users, todoTask, todoapp, company, sections } = cardTodo;

    const todo: ITodo = await this.todoRepository.findOneBy({
      todoapp_reg_id: todoTask.id,
    });

    const taskDeadLine = todoTask?.dueDateTime ? toJapanDateTime(todoTask.dueDateTime) : null;
    const taskUpdated = toJapanDateTime(todoTask.createdDateTime);

    const todoData = new Todo();
    todoData.id = todo?.id || null;
    todoData.name = todoTask.title;
    todoData.todoapp_id = todoapp.id;
    todoData.todoapp_reg_id = todoTask.id;
    todoData.todoapp_reg_url = replaceString(
      MICROSOFT_BASE_URL.concat("/", todoTask.id),
      "{tenant}",
      primaryDomain
    );
    todoData.todoapp_reg_created_by = todoTask.userCreateBy;
    todoData.todoapp_reg_created_at = todo?.todoapp_reg_created_at || taskUpdated;
    todoData.company_id = company.id;
    todoData.deadline = taskDeadLine;
    todoData.is_done = todoTask.percentComplete === COMPLETED;
    todoData.is_reminded = false;
    todoData.is_closed = false;
    todoData.delayed_count = todo?.delayed_count || 0;
    todoData.reminded_count = todo?.reminded_count || 0;

    //set first update task
    if (taskDeadLine) {
      todoData.first_ddl_set_at = todo?.first_ddl_set_at || taskUpdated;
    }

    if (users.length) {
      //set first update task
      todoData.first_assigned_at = todo?.first_assigned_at || taskUpdated;

      dataTodoUsers.push({
        todoId: todoTask.id,
        users: users,
      });
    }

    if (sections.length) {
      dataTodoSections.push({ todoId: todoTask.id, sections });
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
          updateTime: toJapanDateTime(new Date()),
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

    //Update user
    if (todo) {
      await this.todoUserRepository.updateTodoUser(todo, users);
      await this.todoSectionRepository.updateTodoSection(todo, sections);
    }
  };

  updateTodo = async (id: string, task: Todo, todoAppUser: ITodoAppUser, correctDelayedCount: boolean = false): Promise<void> => {
    try {
      // consts assignees = task.todoUsers.map(todoUser => {
      //   consts targetTodoAppUser = todoUser.user.todoAppUsers.find(tau => tau.todoapp_id === todoAppUser.todoapp_id);
      //   return targetTodoAppUser.user_app_id;
      // });
      const microsoftTask: Partial<IMicrosoftTask> = {
        id: task.todoapp_reg_id,
        title: task.name,
        percentComplete: task.is_done ? COMPLETED : 0,
        dueDateTime: task.deadline,
        // FIXME: 担当者を変更できるようにする
      };
      const dataRefresh: IMicrosoftRefresh = { todoAppUser };
      await this.microsoftRequest.updateTask(id, microsoftTask, dataRefresh);

      if (correctDelayedCount && task.delayed_count > 0) {
        task.delayed_count--;
      }

      await this.todoRepository.save(task);
      const todoUpdate: ITodoUpdate = {
        todoId: task.todoapp_reg_id,
        newDueTime: task.deadline,
        newIsDone: task.is_done,
        updateTime: toJapanDateTime(new Date()),
      };
      await this.todoUpdateRepository.saveTodoHistory(task, todoUpdate);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };
}
