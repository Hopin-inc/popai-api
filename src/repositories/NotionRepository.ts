import { In, IsNull, Repository } from "typeorm";
import { Client } from "@notionhq/client";
import { PageObjectResponse, UpdatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { Container, Service } from "typedi";
import moment from "moment";

import Todo from "@/entities/Todo";
import TodoAppUser from "@/entities/TodoAppUser";
import TodoApp from "@/entities/TodoApp";
import Company from "@/entities/Company";
import Section from "@/entities/Section";
import User from "@/entities/User";
import Property from "@/entities/Property";

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
import { IRemindTask, ITodoHistory, ITodoSectionUpdate, ITodoTask, ITodoUpdate, ITodoUserUpdate } from "@/types";
import { INotionTask } from "@/types/notion";
import { NotionPropertyType, PropertyUsageType } from "@/consts/common";

@Service()
export default class NotionRepository {
  private notionRequest: Client;
  private todoRepository: Repository<Todo>;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private propertyRepository: Repository<Property>;
  private todoUpdateRepository: TodoUpdateHistoryRepository;
  private todoHistoryRepository: TodoHistoryRepository;
  private lineQueueRepository: LineMessageQueueRepository;
  private todoUserRepository: TodoUserRepository;
  private todoSectionRepository: TodoSectionRepository;
  private commonRepository: CommonRepository;

  constructor() {
    this.notionRequest = new Client({ auth: process.env.NOTION_ACCESS_TOKEN });
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.propertyRepository = AppDataSource.getRepository(Property);
    this.todoUpdateRepository = Container.get(TodoUpdateHistoryRepository);
    this.todoHistoryRepository = Container.get(TodoHistoryRepository);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
    this.todoUserRepository = Container.get(TodoUserRepository);
    this.todoSectionRepository = Container.get(TodoSectionRepository);
    this.commonRepository = Container.get(CommonRepository);
  }

  public async syncTaskByUserBoards(company: Company, todoapp: TodoApp, notify: boolean = false): Promise<void> {
    const companyId = company.id;
    const todoappId = todoapp.id;
    const sections = await this.commonRepository.getSections(companyId, todoappId);
    await this.getUserPageBoards(sections, company, todoapp, notify);
  }

  private async getUserPageBoards(
    sections: Section[],
    company: Company,
    todoapp: TodoApp,
    notify: boolean = false,
  ): Promise<void> {
    try {
      const todoTasks: ITodoTask<INotionTask>[] = [];

      for (const section of sections) {
        await this.getProperties(section);
        await this.getCardBoards(section.boardAdminUser, section, todoTasks, company, todoapp, sections);
      }

      const dayReminds: number[] = await this.commonRepository.getDayReminds(company.companyConditions);
      await this.filterUpdatePages(todoTasks, notify);
      console.log(`[${company.name} - ${todoapp.name}] filterUpdatePages: ${dayReminds}`);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  }

  private async getProperties(section: Section): Promise<any> {
    try {
      const response = await this.notionRequest.databases.retrieve({ database_id: section.board_id });
      const properties = Object.values(response.properties).map(({ id, name, type }) => ({
        id,
        name,
        type,
      }));

      const updatedProperties = properties.map(({ id, name, type }) => {
        const updatedType = NotionPropertyType[type.toUpperCase()];
        if (updatedType !== undefined) {
          return {
            id,
            name,
            type: updatedType,
            sectionId: section.id,
          };
        }
        return { id, name, type, sectionId: section.id };
      });
      await Promise.all(updatedProperties.map(property => {
        const { id, name, type, sectionId } = property;
        return this.saveProperty(id, name, type, sectionId);
      }));
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  private async saveProperty(id: string, name: string, type: number, sectionId: number, usage?: number) {
    const propertyExists = await this.propertyRepository.findOne({ where: { section_id: sectionId, property_id: id } });
    if (propertyExists) {
      propertyExists.name = name;
      propertyExists.type = type;
      // propertyExists.usage = usage; //TODO:usageがnullで上書きされる恐れがある
      await this.propertyRepository.save(propertyExists);
    } else {
      const property = new Property();
      property.section_id = sectionId;
      property.property_id = id;
      property.name = name;
      property.type = type;
      // property.usage = usage; //TODO:usageは入力されていない

      await this.propertyRepository.save(property);
    }
  }

  private getTitle(pageProperty: Record<any, any>, titleId: string): string {
    try {
      const property = pageProperty.find(prop => prop.id === titleId);
      return property.title.map(t => t.plain_text ?? "").join("");
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  }

  private getAssignee(pageProperty: Record<any, any>, assigneeId: string): string[] {
    try {
      const results: string[] = [];
      const property = pageProperty.find(prop => prop.id === assigneeId);
      if (property.type === "people") {
        const assignees = property.people;
        assignees.forEach(assignee => {
          results.push(assignee.id);
        });
      }
      return results;
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return [];
    }
  }

  private getDue(pageProperty: Record<any, any>, dueId: string): Date {
    try {
      const property = pageProperty.find(prop => prop.id === dueId);
      if (property.type === "date" && property.date) {
        const date = property.date;
        return new Date(date.end ? date.end : date.start);
      } else if (property.type === "formula" && property.formula.type === "date" && property.formula.date) {
        const date = property.formula.date;
        return new Date(date.end ? date.end : date.start);
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  }

  private getSections(pageProperty: Record<any, any>, sectionId: string): string[] {
    try {
      const property = pageProperty.find(prop => prop.id === sectionId);
      if (property.type === "relation") {
        return property.relation.map(section => section.id);
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return [];
    }
  }

  private async getNotionSectionIds(company: Company, todoApp: TodoApp, labelIds: string[]): Promise<number[]> {
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
  }

  private getIsStatus(pageProperty: Record<any, any>, isFlagId: string): boolean {
    try {
      const property = pageProperty.find(prop => prop.id === isFlagId);
      if (property.type === "checkbox") {
        return property.checkbox;
      } else if (property.type === "formula" && property.formula.type === "boolean") {
        return property.formula.boolean;
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  }

  private async getEditedById(usersCompany: User[], todoappId: number, editedBy: string): Promise<number> {
    const users = usersCompany.filter(user => {
      const registeredUserAppIds = user?.todoAppUsers
        .filter(todoAppUser => todoAppUser.todoapp_id === todoappId)
        .reduce((userAppIds: string[], todoAppUser) => {
          userAppIds.push(todoAppUser.user_app_id);
          return userAppIds;
        }, []);
      return registeredUserAppIds.find(id => id === editedBy);
    });
    if (users.length) {
      return users[0].id;
    } else {
      return;
    }
  }

  private getString(pageInfo: PageObjectResponse, type: string): string {
    try {
      switch (type) {
        case "last_edited_by":
          return pageInfo.last_edited_by.id;
        case "created_by":
          return pageInfo.created_by.id;
        case "url":
          return pageInfo.url;
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  }

  private getDate(pageInfo: PageObjectResponse, propName: string): Date {
    try {
      const dateStr = pageInfo[propName];
      return new Date(dateStr);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  }

  private async getCardBoards(
    boardAdminUser: User,
    section: Section,
    todoTasks: ITodoTask<INotionTask>[],
    company: Company,
    todoapp: TodoApp,
    sections: Section[],
  ): Promise<void> {
    if (!boardAdminUser?.todoAppUsers.length) return;

    for (const todoAppUser of boardAdminUser.todoAppUsers) {
      if (section.board_id) {
        try {
          let response = await this.notionRequest.databases.query({
            database_id: section.board_id,
            filter: {
              timestamp: "last_edited_time",
              last_edited_time: { after: "2023-02-19" }, //TODO:最新更新日時を挿入する
            },
          });
          const pages = response.results;
          while (response.has_more) {
            response = await this.notionRequest.databases.query({
              database_id: section.board_id,
              start_cursor: response.next_cursor,
            });
            pages.push(...response.results);
          }

          const usageProperty = await this.propertyRepository
            .createQueryBuilder("property")
            .where("property.section_id = :sectionId", { sectionId: section.id })
            .andWhere("property.usage IS NOT NULL")
            .getMany();
          const pageIds: string[] = pages.map(page => page.id);
          const pageTodos: INotionTask[] = [];

          await Promise.all(pageIds.map(pageId => {
            return this.getPages(pageId, pageTodos, company, todoapp, usageProperty);
          }));
          await Promise.all(pageTodos.map(pageTodo => {
            return this.addTodoTask(pageTodo, todoTasks, company, todoapp, sections, todoAppUser);
          }));
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  }

  private getUsageProperty(usageProperty: Property[], pagePropertyIds: string[], usageId: number) {
    const targetProperty = usageProperty.filter(property => property.usage === usageId);
    const foundProperty = targetProperty.find(property => pagePropertyIds.includes(property.property_id));
    return foundProperty ? foundProperty.property_id : null;
  }

  private async getPages(
    pageId: string,
    pageTodos: INotionTask[],
    company: Company,
    todoapp: TodoApp,
    usageProperty: Property[],
  ): Promise<void> {
    const pageInfo = await this.notionRequest.pages.retrieve({ page_id: pageId }) as PageObjectResponse;
    const pageProperty = Object.keys(pageInfo.properties).map((key) => pageInfo.properties[key]) as Record<any, any>;
    if (pageProperty) {
      const pagePropertyIds = pageProperty.map((obj) => obj.id);
      const propertyId = {
        title: this.getUsageProperty(usageProperty, pagePropertyIds, PropertyUsageType.TITLE),
        section: this.getUsageProperty(usageProperty, pagePropertyIds, PropertyUsageType.SECTION),
        assignee: this.getUsageProperty(usageProperty, pagePropertyIds, PropertyUsageType.ASSIGNEE),
        due: this.getUsageProperty(usageProperty, pagePropertyIds, PropertyUsageType.DUE),
        isDone: this.getUsageProperty(usageProperty, pagePropertyIds, PropertyUsageType.IS_DONE),
        isClosed: this.getUsageProperty(usageProperty, pagePropertyIds, PropertyUsageType.IS_CLOSED),
      };

      const name = this.getTitle(pageProperty, propertyId.title);
      if (!name) return;
      const pageTodo: INotionTask = {
        todoapp_reg_id: pageId,
        name,
        notion_user_id: this.getAssignee(pageProperty, propertyId.assignee),
        sections: this.getSections(pageProperty, propertyId.section),
        section_ids: [],
        deadline: this.getDue(pageProperty, propertyId.due),
        is_done: this.getIsStatus(pageProperty, propertyId.isDone),
        created_by: this.getString(pageInfo, "created_by"),
        created_by_id: null,
        created_at: this.getDate(pageInfo, "created_time"),
        last_edited_by: this.getString(pageInfo, "last_edited_by"),
        last_edited_by_id: null,
        last_edited_at: this.getDate(pageInfo, "last_edited_time"),
        todoapp_reg_url: this.getString(pageInfo, "url"),
        dueReminder: null,
        closed: this.getIsStatus(pageProperty, propertyId.isClosed),
      };
      pageTodo.created_by_id = await this.getEditedById(company.users, todoapp.id, pageTodo.created_by);
      pageTodo.last_edited_by_id = await this.getEditedById(company.users, todoapp.id, pageTodo.last_edited_by);
      pageTodo.section_ids = await this.getNotionSectionIds(company, todoapp, pageTodo.sections);
      pageTodos.push(pageTodo);
    }
  }

  private async addTodoTask(
    pageTodo: INotionTask,
    todoTasks: ITodoTask<INotionTask>[],
    company: Company,
    todoapp: TodoApp,
    sections: Section[],
    todoAppUser: TodoAppUser,
  ): Promise<void> {
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
  }

  private async filterUpdatePages(pageTodos: ITodoTask<INotionTask>[], notify: boolean = false): Promise<void> {
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
    await this.createTodo(cards, notify);
  }

  private async createTodo(taskReminds: IRemindTask<INotionTask>[], notify: boolean = false): Promise<void> {
    try {
      if (!taskReminds.length) return;
      const todos: Todo[] = [];
      const dataTodoUpdates: ITodoUpdate[] = [];
      const dataTodoHistories: ITodoHistory[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];
      const dataTodoSections: ITodoSectionUpdate[] = [];

      await Promise.all(taskReminds.map(taskRemind => {
        return this.addDataTodo(taskRemind, todos, dataTodoUpdates, dataTodoHistories, dataTodoUsers, dataTodoSections);
      }));

      const savedTodos: Todo[] = await this.todoRepository.find({
        where: { deleted_at: IsNull() },
        relations: [
          "todoUsers.user.chattoolUsers",
          "company.implementedChatTools.chattool",
          "todoSections.section",
        ],
      });
      const response = await this.todoRepository.upsert(todos, []);
      if (response) {
        await Promise.all([
          this.todoHistoryRepository.saveTodoHistories(savedTodos, dataTodoHistories, notify),
          this.todoUpdateRepository.saveTodoUpdateHistories(dataTodoUpdates),
          this.todoUserRepository.saveTodoUsers(dataTodoUsers),
          this.todoSectionRepository.saveTodoSections(dataTodoSections),
          // await this.lineQueueRepository.pushTodoLineQueues(dataLineQueues),
        ]);
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  private async addDataTodo(
    taskRemind: IRemindTask<INotionTask>,
    dataTodos: Todo[],
    dataTodoUpdates: ITodoUpdate[],
    dataTodoHistories: ITodoHistory[],
    dataTodoUsers: ITodoUserUpdate[],
    dataTodoSections: ITodoSectionUpdate[],
  ): Promise<void> {
    const cardTodo = taskRemind.cardTodo;
    const { users, todoTask, todoapp, company, sections } = cardTodo;
    const todo: Todo = await this.todoRepository.findOneBy({ todoapp_reg_id: todoTask.todoapp_reg_id });
    const deadline = todoTask.deadline ? toJapanDateTime(todoTask.deadline) : null;

    const todoData = new Todo();
    todoData.id = todo?.id ?? null;
    todoData.name = todoTask.name;
    todoData.todoapp_id = todoapp.id;
    todoData.todoapp_reg_id = todoTask.todoapp_reg_id;
    todoData.todoapp_reg_url = todoTask.todoapp_reg_url;
    todoData.todoapp_reg_created_by = todoTask.created_by_id;
    todoData.todoapp_reg_created_at = toJapanDateTime(todoTask.created_at);
    todoData.company_id = company.id;
    todoData.deadline = deadline;
    todoData.is_done = todoTask.is_done;
    todoData.is_reminded = todo?.is_reminded ?? false;
    todoData.is_closed = todoTask.closed;
    todoData.delayed_count = todo?.delayed_count ?? 0;
    todoData.reminded_count = todo?.reminded_count ?? 0;

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
      editedBy: todoTask.last_edited_by_id,
    });

    //update deadline task
    if (deadline || todoData.is_done) {
      const isDeadlineChanged = !moment(deadline).isSame(todo?.deadline);
      const isDoneChanged = todo?.is_done !== todoData.is_done;

      if (isDeadlineChanged || isDoneChanged) {
        dataTodoUpdates.push({
          todoId: todoTask.todoapp_reg_id,
          dueTime: todo?.deadline,
          newDueTime: deadline,
          updateTime: toJapanDateTime(todoTask.last_edited_at),
        });
      }

      if (!todoData.is_done && taskRemind.delayedCount > 0 && (isDeadlineChanged || !todoData.delayed_count)) {
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
  }

  updateTodo = async (
    id: string,
    task: Todo,
    todoAppUser: TodoAppUser,
    correctDelayedCount: boolean = false,
  ): Promise<void> => {
    try {
      const isDoneProperty = await this.propertyRepository.findOneBy({
        section_id: In(task.company.sections.map(section => section.id)),
        usage: PropertyUsageType.IS_DONE,
      });
      const payload: UpdatePageParameters = {
        page_id: task.todoapp_reg_id,
        properties: {
          [isDoneProperty.name]: {
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