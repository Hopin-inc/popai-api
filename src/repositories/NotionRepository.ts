import { In, Repository } from "typeorm";
import { Client } from "@notionhq/client";
import { PageObjectResponse, UpdatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { Container, Service } from "typedi";
import moment from "moment";

import ColumnName from "@/entities/ColumnName";
import Todo from "@/entities/Todo";
import TodoAppUser from "@/entities/TodoAppUser";

import TodoUserRepository from "./modules/TodoUserRepository";
import TodoUpdateHistoryRepository from "./modules/TodoUpdateHistoryRepository";
import TodoHistoryRepository from "@/repositories/modules/TodoHistoryRepository";
import CommonRepository from "./modules/CommonRepository";
import LineMessageQueueRepository from "./modules/LineMessageQueueRepository";
import TodoSectionRepository from "./modules/TodoSectionRepository";

import { diffDays, toJapanDateTime } from "@/utils/common";
import logger from "@/logger/winston";
import AppDataSource from "@/config/data-source";
import { LoggerError } from "@/exceptions";
import {
  IColumnName,
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
  ITodoHistory
} from "@/types";
import { INotionProperty, INotionTask } from "@/types/notion";

@Service()
export default class NotionRepository {
  private notionRequest: Client;
  private todoRepository: Repository<Todo>;
  private columnNameRepository: Repository<ColumnName>;
  private todoUpdateRepository: TodoUpdateHistoryRepository;
  private todoHistoryRepository: TodoHistoryRepository;
  private lineQueueRepository: LineMessageQueueRepository;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private todoUserRepository: TodoUserRepository;
  private todoSectionRepository: TodoSectionRepository;
  private commonRepository: CommonRepository;

  constructor() {
    this.notionRequest = new Client({ auth: process.env.NOTION_ACCESS_TOKEN });
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = Container.get(TodoUpdateHistoryRepository);
    this.todoHistoryRepository = Container.get(TodoHistoryRepository);
    this.columnNameRepository = AppDataSource.getRepository(ColumnName);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.todoUserRepository = Container.get(TodoUserRepository);
    this.todoSectionRepository = Container.get(TodoSectionRepository);
    this.commonRepository = Container.get(CommonRepository);
  }

  syncTaskByUserBoards = async (company: ICompany, todoapp: ITodoApp): Promise<void> => {
    const companyId = company.id;
    const todoappId = todoapp.id;
    const sections = await this.commonRepository.getSections(companyId, todoappId);
    await this.getUserPageBoards(sections, company, todoapp);
  };

  getUserPageBoards = async (sections: ISection[], company: ICompany, todoapp: ITodoApp): Promise<void> => {
    try {
      const todoTasks: ITodoTask<INotionTask>[] = [];

      for (const section of sections) {
        const columnName = await this.getColumnName(section);
        if (columnName) {
          await this.getCardBoards(section.boardAdminUser, section, todoTasks, company, todoapp, columnName, sections);
        }
      }

      const dayReminds: number[] = await this.commonRepository.getDayReminds(company.companyConditions);
      await this.filterUpdatePages(dayReminds, todoTasks);
      console.log(`[${company.name} - ${todoapp.name}] filterUpdatePages: ${dayReminds}`);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getColumnName = async (section: ISection): Promise<IColumnName> => {
    return await this.columnNameRepository.findOneBy({ section_id: section.id });
  };

  getTaskName = (columnName: IColumnName, pageProperty: INotionProperty): string => {
    try {
      const todoProp = pageProperty[columnName.label_todo];
      if (todoProp.type === "title" && todoProp.title.length) {
        return todoProp.title.map(t => t.plain_text ?? "").join("");
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  };

  getAssignee = (columnName: IColumnName, pageProperty: INotionProperty): string[] => {
    try {
      const results: string[] = [];
      const assigneeProp = pageProperty[columnName.label_assignee];
      if (assigneeProp.type === "people") {
        const assignees = assigneeProp.people;
        assignees.forEach(assignee => {
          results.push(assignee.id);
        });
      }
      return results;
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return [];
    }
  };

  getDue = (columnName: IColumnName, pageProperty: INotionProperty): Date => {
    try {
      const labelProp = pageProperty[columnName.label_due];
      if (labelProp.type === "date" && labelProp.date) {
        const date = labelProp.date;
        return new Date(date.end ? date.end : date.start);
      } else if (labelProp.type === "formula" && labelProp.formula.type === "date" && labelProp.formula.date) {
        const date = labelProp.formula.date;
        return new Date(date.end ? date.end : date.start);
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  };

  getNotionSections = (columnName: IColumnName, pageProperty: INotionProperty): string[] => {
    try {
      const sectionProp = pageProperty[columnName.label_section];
      if (sectionProp.type === "relation") {
        return sectionProp.relation.map(section => section.id);
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return [];
    }
  };

  getNotionSectionIds = async (company: ICompany, todoApp: ITodoApp, labelIds: string[]): Promise<number[]> => {
    const registeredSectionLabels = await this.commonRepository.getSectionLabels(company.id, todoApp.id);
    const registeredLabelRecords = registeredSectionLabels.map(sectionLabel => {
      return { sectionId: sectionLabel.section_id, labelId: sectionLabel.label_id };
    });

    const results: number[] = [];
    registeredLabelRecords.forEach(record => {
      if (labelIds.includes(record.labelId)) {
        results.push(record.sectionId);
      }
    });
    return results;
  };


  getIsDone = (columnName: IColumnName, pageProperty: INotionProperty): boolean => {
    try {
      const isDoneProp = pageProperty[columnName.label_is_done];
      if (isDoneProp.type === "checkbox") {
        return isDoneProp.checkbox;
      } else if (isDoneProp.type === "formula" && isDoneProp.formula.type === "boolean") {
        return isDoneProp.formula.boolean;
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getIsArchive = (columnName: IColumnName, pageProperty: INotionProperty): boolean => {
    try {
      const isArchiveProp = pageProperty[columnName.label_is_archived];
      if (isArchiveProp.type === "checkbox") {
        return isArchiveProp.checkbox;
      } else if (isArchiveProp.type === "formula" && isArchiveProp.formula.type === "boolean") {
        return isArchiveProp.formula.boolean;
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getCreatedBy = (pageInfo: PageObjectResponse): string => {
    try {
      return pageInfo.created_by.id;
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getCreatedById = async (usersCompany: IUser[], todoappId: number, createdBy: string): Promise<number> => {
    const users = usersCompany.filter(user => {
      const registeredUserAppIds = user?.todoAppUsers
        .filter(todoAppUser => todoAppUser.todoapp_id === todoappId)
        .reduce((userAppIds: string[], todoAppUser) => {
          userAppIds.push(todoAppUser.user_app_id);
          return userAppIds;
        }, []);
      return registeredUserAppIds.find(id => id === createdBy);
    });
    if (users.length) {
      return users[0].id;
    } else {
      return;
    }
  };

  getLastEditedAt = (pageInfo: PageObjectResponse): Date => {
    try {
      const lastEditedAtStr = pageInfo.last_edited_time;
      return new Date(lastEditedAtStr);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getCreatedAt = (pageInfo: PageObjectResponse): Date => {
    try {
      const createdAtStr = pageInfo.created_time;
      return new Date(createdAtStr);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getUrl = (pageInfo: PageObjectResponse): string => {
    try {
      return pageInfo.url;
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getCardBoards = async (
    boardAdminUser: IUser,
    section: ISection,
    todoTasks: ITodoTask<INotionTask>[],
    company: ICompany,
    todoapp: ITodoApp,
    columnName: IColumnName,
    sections: ISection[]
  ): Promise<void> => {
    if (!boardAdminUser?.todoAppUsers.length) return;

    for (const todoAppUser of boardAdminUser.todoAppUsers) {
      if (section.board_id) {
        try {
          let response = await this.notionRequest.databases.query({ database_id: section.board_id });
          const pages = response.results;
          while (response.has_more) {
            response = await this.notionRequest.databases.query({
              database_id: section.board_id,
              start_cursor: response.next_cursor,
            });
            pages.push(...response.results);
          }

          const pageIds: string[] = pages.map(page => page.id);
          const pageTodos: INotionTask[] = [];
          await Promise.all(pageIds.map(pageId => {
            return this.getPages(pageId, pageTodos, section, company, todoapp, columnName);
          }));
          await Promise.all(pageTodos.map(pageTodo => {
            return this.addTodoTask(pageTodo, todoTasks, company, todoapp, sections, todoAppUser);
          }));
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  };

  getPages = async (
    pageId: string,
    pageTodos: INotionTask[],
    section: ISection,
    company: ICompany,
    todoapp: ITodoApp,
    columnName: IColumnName
  ): Promise<void> => {
    const pageInfo = await this.notionRequest.pages.retrieve({ page_id: pageId }) as PageObjectResponse;
    const pageProperty = pageInfo.properties;
    if (pageProperty) {
      const name = this.getTaskName(columnName, pageProperty);
      if (!name) return;

      const pageTodo: INotionTask = {
        todoapp_reg_id: pageId,
        name,
        notion_user_id: this.getAssignee(columnName, pageProperty),
        sections: this.getNotionSections(columnName, pageProperty),
        section_ids: [],
        deadline: this.getDue(columnName, pageProperty),
        is_done: this.getIsDone(columnName, pageProperty),
        created_by: this.getCreatedBy(pageInfo),
        created_by_id: null,
        created_at: this.getCreatedAt(pageInfo),
        last_edited_at: this.getLastEditedAt(pageInfo),
        todoapp_reg_url: this.getUrl(pageInfo),
        dueReminder: null,
        closed: this.getIsArchive(columnName, pageProperty),
      };
      pageTodo.created_by_id = await this.getCreatedById(company.users, todoapp.id, pageTodo.created_by);
      pageTodo.section_ids = await this.getNotionSectionIds(company, todoapp, pageTodo.sections);
      pageTodos.push(pageTodo);
    }
  };

  addTodoTask = async (
    pageTodo: INotionTask,
    todoTasks: ITodoTask<INotionTask>[],
    company: ICompany,
    todoapp: ITodoApp,
    sections: ISection[],
    todoAppUser: ITodoAppUser
  ): Promise<void> => {
    const users = await this.todoUserRepository.getUserAssignTask(company.users, pageTodo.notion_user_id);

    const page: ITodoTask<INotionTask> = {
      todoTask: pageTodo,
      company,
      todoapp,
      todoAppUser,
      sections: sections.filter(section => pageTodo.section_ids.includes(section.id)),
      users,
    };

    const taskFound = todoTasks.find(task => task.todoTask?.todoapp_reg_id === pageTodo.todoapp_reg_id);
    if (taskFound) {
      taskFound.users = users;
    } else {
      todoTasks.push(page);
    }
  };

  filterUpdatePages = async (dayReminds: number[], pageTodos: ITodoTask<INotionTask>[]): Promise<void> => {
    const cards: IRemindTask<INotionTask>[] = [];

    for (const pageTodo of pageTodos) {
      let delayedCount = 0;
      let dayDurations;
      const todoTask = pageTodo.todoTask;

      if (todoTask.deadline) {
        dayDurations = diffDays(toJapanDateTime(todoTask.deadline), toJapanDateTime(new Date()));
        delayedCount = dayDurations;
      }

      cards.push({
        remindDays: dayDurations,
        cardTodo: pageTodo,
        delayedCount: delayedCount,
      });
    }
    await this.createTodo(cards);
  };

  createTodo = async (taskReminds: IRemindTask<INotionTask>[]): Promise<void> => {
    try {
      if (!taskReminds.length) return;
      const dataTodos: Todo[] = [];
      const dataTodoUpdates: ITodoUpdate[] = [];
      const dataTodoHistories: ITodoHistory[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];
      const dataTodoSections: ITodoSectionUpdate[] = [];

      await Promise.all(taskReminds.map(taskRemind => {
        return this.addDataTodo(taskRemind, dataTodos, dataTodoUpdates, dataTodoHistories, dataTodoUsers, dataTodoSections);
      }));

      const response = await this.todoRepository.upsert(dataTodos, []);
      if (response) {
        await Promise.all([
          this.todoHistoryRepository.saveTodoHistories(dataTodoHistories),
          this.todoUpdateRepository.saveTodoUpdateHistories(dataTodoUpdates),
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
    taskRemind: IRemindTask<INotionTask>,
    dataTodos: Todo[],
    dataTodoUpdates: ITodoUpdate[],
    dataTodoHistories: ITodoHistory[],
    dataTodoUsers: ITodoUserUpdate[],
    dataTodoSections: ITodoSectionUpdate[],
  ): Promise<void> => {
    const cardTodo = taskRemind.cardTodo;
    const { users, todoTask, todoapp, company, sections } = cardTodo;

    const todo: ITodo = await this.todoRepository.findOneBy({ todoapp_reg_id: todoTask.todoapp_reg_id });

    const taskDeadLine = todoTask.deadline ? toJapanDateTime(todoTask.deadline) : null;

    const todoData = new Todo();
    todoData.id = todo?.id || null;
    todoData.name = todoTask.name;
    todoData.todoapp_id = todoapp.id;
    todoData.todoapp_reg_id = todoTask.todoapp_reg_id;
    todoData.todoapp_reg_url = todoTask.todoapp_reg_url;
    todoData.todoapp_reg_created_by = todoTask.created_by_id;
    todoData.todoapp_reg_created_at = toJapanDateTime(todoTask.created_at);
    todoData.company_id = company.id;
    todoData.deadline = taskDeadLine;
    todoData.is_done = todoTask.is_done;
    todoData.is_reminded = !!todoTask.dueReminder;
    todoData.is_closed = todoTask.closed;
    todoData.delayed_count = todo?.delayed_count || 0;
    todoData.reminded_count = todo?.reminded_count || 0;

    if (users.length) {
      dataTodoUsers.push({ todoId: todoTask.todoapp_reg_id, users });
    }

    if (sections.length) {
      dataTodoSections.push({ todoId: todoTask.todoapp_reg_id, sections });
    }

    dataTodoHistories.push({
      todoId: todoTask.todoapp_reg_id,
      name: todoTask.name,
      deadline: todoTask.deadline,
      users: users,
      isDone: todoTask.is_done,
      isClosed: todoTask.closed,
      todoappRegUpdatedAt: todoTask.last_edited_at,
    });

    //update deadline task
    if (taskDeadLine || todoData.is_done) {
      const isDeadlineChanged = !moment(taskDeadLine).isSame(todo?.deadline);
      const isDoneChanged = todo?.is_done !== todoData.is_done;

      if (isDeadlineChanged || isDoneChanged) {
        dataTodoUpdates.push({
          todoId: todoTask.todoapp_reg_id,
          dueTime: todo?.deadline,
          newDueTime: taskDeadLine,
          updateTime: toJapanDateTime(todoTask.last_edited_at),
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

    //update user
    if (todo) {
      await Promise.all([
        this.todoUserRepository.updateTodoUser(todo, users),
        this.todoSectionRepository.updateTodoSection(todo, sections),
      ]);
    }
  };

  updateTodo = async (
    id: string,
    task: Todo,
    todoAppUser: ITodoAppUser,
    correctDelayedCount: boolean = false
  ): Promise<void> => {
    try {
      const columnName = await this.columnNameRepository.findOneBy({
        section_id: In(task.company.sections.map(section => section.id)),
      });
      const payload: UpdatePageParameters = {
        page_id: task.todoapp_reg_id,
        properties: {
          [columnName.label_is_done]: {
            type: "checkbox",
            checkbox: task.is_done,
          },
        },
      };
      await this.notionRequest.pages.update(payload);

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
      await this.todoUpdateRepository.saveTodoUpdateHistory(task, todoUpdate);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };
}