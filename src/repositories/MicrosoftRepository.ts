import { LoggerError } from "@/exceptions";
import { Repository } from "typeorm";
import { Service, Container } from "typedi";
import FormData from "form-data";

import ImplementedTodoApp from "@/entities/settings/ImplementedTodoApp";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";
import Company from "@/entities/settings/Company";
import Section from "@/entities/settings/Section";
import TodoApp from "@/entities/masters/TodoApp";

import LineMessageQueueRepository from "./modules/LineMessageQueueRepository";
import TodoUpdateHistoryRepository from "./modules/TodoUpdateHistoryRepository";
import CommonRepository from "./modules/CommonRepository";
import TodoSectionRepository from "./modules/TodoSectionRepository";

import { replaceString, toJapanDateTime, diffDays } from "@/utils/common";
import MicrosoftRequest from "@/services/MicrosoftRequest";
import logger from "@/logger/winston";
import { fetchApi } from "@/libs/request";
import AppDataSource from "@/config/data-source";
import { IRemindTask, ITodoSectionUpdate, ITodoTask, ITodoUpdate, ITodoUserUpdate } from "@/types";
import { IMicrosoftRefresh, IMicrosoftTask, IMicrosoftToken } from "@/types/microsoft";
import { COMPLETED, MICROSOFT_BASE_URL } from "@/consts/microsoft";
import { TodoRepository } from "@/repositories/TodoRepository";
import { TodoUserRepository } from "@/repositories/TodoUserRepository";
import { TodoAppUserRepository } from "@/repositories/TodoAppUserRepository";
import { SectionRepository } from "@/repositories/SectionRepository";
import { ImplementedTodoAppRepository } from "@/repositories/ImplementedTodoAppRepository";

@Service()
export default class MicrosoftRepository {
  private microsoftRequest: MicrosoftRequest;
  private todoUpdateRepository: TodoUpdateHistoryRepository;
  private lineQueueRepository: LineMessageQueueRepository;
  private todoSectionRepository: TodoSectionRepository;
  private commonRepository: CommonRepository;

  constructor() {
    this.microsoftRequest = Container.get(MicrosoftRequest);
    this.todoUpdateRepository = Container.get(TodoUpdateHistoryRepository);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
    this.todoSectionRepository = Container.get(TodoSectionRepository);
    this.commonRepository = Container.get(CommonRepository);
  }

  public async syncTaskByUserBoards(company: Company, todoapp: TodoApp): Promise<void> {
    const companyId = company.id;
    const todoappId = todoapp.id;

    await this.updateUsersMicrosoft(company.users, todoappId);
    const sections = await SectionRepository.getSections(companyId, todoappId);
    await this.getUserTaskBoards(sections, company, todoapp);
  }

  private async getUserTaskBoards(
    sections: Section[],
    company: Company,
    todoapp: TodoApp,
  ): Promise<void> {
    try {
      const todoTasks: ITodoTask<IMicrosoftTask>[] = [];

      for (const section of sections) {
        await this.getTaskBoards(section.boardAdminUser, section, todoTasks, company, todoapp);
      }
      console.log(`[${company.name} - ${todoapp.name}] getCardBoards: ${todoTasks.length}`);

      const dayReminds: number[] = await this.commonRepository.getDayReminds(company.companyConditions);
      const implementedTodoApp = await ImplementedTodoAppRepository.getImplementTodoApp(company.id, todoapp.id);
      if (implementedTodoApp) {
        await this.filterUpdateTask(dayReminds, todoTasks, implementedTodoApp);
      }
      console.log(`[${company.name} - ${todoapp.name}] filterUpdateTask: ${dayReminds}`);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  }

  private async getTaskBoards(
    boardAdminUser: User,
    section: Section,
    todoTasks: ITodoTask<IMicrosoftTask>[],
    company: Company,
    todoapp: TodoApp,
  ): Promise<void> {
    if (!boardAdminUser?.todoAppUsers.length) return;

    for (const todoAppUser of boardAdminUser.todoAppUsers) {
      if (todoAppUser.api_token && section.board_id) {
        try {
          const dataRefresh: IMicrosoftRefresh = { todoAppUser };
          const taskTodos = await this.microsoftRequest.getAllTasksFromPlan(section.board_id, dataRefresh);

          const tasks = taskTodos["value"];
          if (tasks && tasks.length) {
            await Promise.all(tasks.map(todoTask => {
              return this.addTodoTask(todoTask, section, todoTasks, company, todoapp, todoAppUser);
            }));
          }
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  }

  private async addTodoTask(
    todoTask: IMicrosoftTask,
    section: Section,
    todoTasks: ITodoTask<IMicrosoftTask>[],
    company: Company,
    todoapp: TodoApp,
    todoAppUser: TodoAppUser,
  ): Promise<void> {
    let userCreateBy = null;
    if (todoTask.createdBy) {
      const userCreates = await TodoUserRepository.getUserAssignTask(company.users, [
        todoTask.createdBy?.user?.id,
      ]);

      if (userCreates.length) {
        userCreateBy = userCreates.shift().id;
      }
    }

    const userAssigns = Object.keys(todoTask.assignments);
    const users = await TodoUserRepository.getUserAssignTask(
      company.users,
      userAssigns,
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
  }

  private async updateUsersMicrosoft(usersCompany: User[], todoappId: number): Promise<void> {
    const users = usersCompany.filter((user) => {
      return user?.todoAppUsers.find(
        (todoAppUser) => todoAppUser.todoapp_id === todoappId && !todoAppUser.user_app_id,
      );
    });

    for (const user of users) {
      if (user.todoAppUsers.length) {
        await this.updateMicrosoftUser(user.todoAppUsers);
      }
    }
  }

  private async updateMicrosoftUser(todoAppUsers: TodoAppUser[]): Promise<any> {
    for (const todoAppUser of todoAppUsers) {
      if (todoAppUser.api_token) {
        try {
          const dataRefresh: IMicrosoftRefresh = { todoAppUser };
          const me = await this.microsoftRequest.getMyInfo(dataRefresh);
          todoAppUser.user_app_id = me?.id;
          await TodoAppUserRepository.save(todoAppUser);
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  }

  public async refreshToken(dataRefresh: IMicrosoftRefresh): Promise<TodoAppUser | null> {
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
          const todoAppUser: TodoAppUser = await TodoAppUserRepository.findOneBy({
            todoapp_id: todoAppUserData.todoapp_id,
            employee_id: todoAppUserData.employee_id,
          });

          if (todoAppUser) {
            todoAppUser.api_token = response.access_token;
            todoAppUser.refresh_token = response.refresh_token;
            todoAppUser.expires_in = response.expires_in;
            return await TodoAppUserRepository.save(todoAppUser);
          }
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }

    return null;
  }

  private async filterUpdateTask(
    _dayReminds: number[],
    todoTaskLists: ITodoTask<IMicrosoftTask>[],
    implementTodoApp: ImplementedTodoApp,
  ): Promise<void> {
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
  }

  private async createTodo(
    taskReminds: IRemindTask<IMicrosoftTask>[],
    implementedTodoApp: ImplementedTodoApp,
  ): Promise<void> {
    try {
      if (!taskReminds.length) return;

      const dataTodos: Todo[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];
      const dataTodoSections: ITodoSectionUpdate[] = [];

      await Promise.all(taskReminds.map(taskRemind => {
        return this.addDataTodo(
          taskRemind,
          dataTodos,
          dataTodoUsers,
          dataTodoSections,
          implementedTodoApp.primary_domain,
        );
      }));

      const response = await TodoRepository.upsert(dataTodos, []);

      if (response) {
        await Promise.all([
          TodoUserRepository.saveTodoUsers(dataTodoUsers),
          this.todoSectionRepository.saveTodoSections(dataTodoSections),
          // await this.lineQueueRepository.pushTodoLineQueues(dataLineQueues),
        ]);
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  private async addDataTodo(
    taskRemind: IRemindTask<IMicrosoftTask>,
    dataTodos: Todo[],
    dataTodoUsers: ITodoUserUpdate[],
    dataTodoSections: ITodoSectionUpdate[],
    primaryDomain: string,
  ): Promise<void> {
    const cardTodo = taskRemind.cardTodo;
    const { users, todoTask, todoapp, company, sections } = cardTodo;

    const todo: Todo = await TodoRepository.findOneBy({
      todoapp_reg_id: todoTask.id,
    });

    const taskDeadLine = todoTask?.dueDateTime ? toJapanDateTime(todoTask.dueDateTime) : null;
    const taskUpdated = toJapanDateTime(todoTask.createdDateTime);
    const todoData = new Todo(todoTask, company, todoapp, todo, null, primaryDomain);

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

    dataTodos.push(todoData);

    //Update user
    if (todo) {
      await TodoUserRepository.updateTodoUser(todo, users);
      await this.todoSectionRepository.updateTodoSection(todo, sections);
    }
  }

  public async updateTodo(
    id: string,
    task: Todo,
    todoAppUser: TodoAppUser,
    correctDelayedCount: boolean = false,
  ): Promise<void> {
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

      await TodoRepository.save(task);
      const todoUpdate: ITodoUpdate = {
        todoId: task.todoapp_reg_id,
        newDueTime: task.deadline,
        newIsDone: task.is_done,
        updateTime: toJapanDateTime(new Date()),
      };
      await this.todoUpdateRepository.saveTodoUpdateHistory(task, todoUpdate);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }
}
