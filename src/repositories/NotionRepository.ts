import { In, Repository } from "typeorm";
import { Client } from "@notionhq/client";
import { CreatePageResponse, PageObjectResponse, UpdatePageParameters } from "@notionhq/client/build/src/api-endpoints";
import { Container, Service } from "typedi";
import moment from "moment";

import Todo from "@/entities/transactions/Todo";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import TodoApp from "@/entities/masters/TodoApp";
import Company from "@/entities/settings/Company";
import Section from "@/entities/settings/Section";
import User from "@/entities/settings/User";
import Property from "@/entities/settings/Property";
import PropertyOption from "@/entities/settings/PropertyOption";

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
  IDailyReportItems,
  IRemindTask,
  ITodoHistory,
  ITodoSectionUpdate,
  ITodoTask,
  ITodoUpdate,
  ITodoUserUpdate,
} from "@/types";
import { INotionTask } from "@/types/notion";
import { NotionPropertyType, PropertyUsageType, TodoAppCode } from "@/consts/common";
import NotionPageBuilder from "@/common/NotionPageBuilder";
import SlackMessageBuilder from "@/common/SlackMessageBuilder";

@Service()
export default class NotionRepository {
  private notionRequest: Client;
  private todoRepository: Repository<Todo>;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private propertyRepository: Repository<Property>;
  private propertyOptionRepository: Repository<PropertyOption>;
  private sectionRepository: Repository<Section>;
  private todoUpdateRepository: TodoUpdateHistoryRepository;
  private todoHistoryRepository: TodoHistoryRepository;
  private lineQueueRepository: LineMessageQueueRepository;
  private todoUserRepository: TodoUserRepository;
  private todoSectionRepository: TodoSectionRepository;
  private notionPageBuilder: NotionPageBuilder;
  private commonRepository: CommonRepository;

  constructor() {
    this.notionRequest = new Client({ auth: process.env.NOTION_ACCESS_TOKEN });
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.propertyRepository = AppDataSource.getRepository(Property);
    this.propertyOptionRepository = AppDataSource.getRepository(PropertyOption);
    this.sectionRepository = AppDataSource.getRepository(Section);
    this.todoUpdateRepository = Container.get(TodoUpdateHistoryRepository);
    this.todoHistoryRepository = Container.get(TodoHistoryRepository);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
    this.todoUserRepository = Container.get(TodoUserRepository);
    this.todoSectionRepository = Container.get(TodoSectionRepository);
    this.notionPageBuilder = Container.get(NotionPageBuilder);
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

      const processedBoardIds = new Set<string>();
      for (const section of sections) {
        if (!processedBoardIds.has(section.board_id)) {
          processedBoardIds.add(section.board_id);
          await this.getProperties(section);
          await this.getCardBoards(section.boardAdminUser, section, todoTasks, company, todoapp, sections);
        }
      }

      const dayReminds: number[] = await this.commonRepository.getDayReminds(company.companyConditions);
      await this.filterUpdatePages(todoTasks, notify);
      console.log(`[${company.name} - ${todoapp.name}] filterUpdatePages: ${dayReminds}`);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  }

  private async getProperties(section: Section): Promise<void> {
    try {
      const response = await this.notionRequest.databases.retrieve({ database_id: section.board_id });
      const properties = Object.values(response.properties);

      const updatedProperties = properties.map(({ id, name, type, ...rest }) => {
        const updatedType = NotionPropertyType[type.toUpperCase()];
        if (updatedType !== undefined) {
          return {
            id,
            name,
            type: updatedType,
            sectionId: section.id,
            ...rest,
          };
        }
      });

      await Promise.all(updatedProperties.map(async property => {
        const { id, name, type, sectionId } = property;
        await this.saveProperty(id, name, type, sectionId);
        return this.getPropertyOptions(property, sectionId);
      }));
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  private async savePropertyOption(propertyId: number, optionId: string, sectionId: number, name?: string) {
    const propertyOptionExists = await this.propertyOptionRepository
      .createQueryBuilder("property_options")
      .leftJoinAndSelect(
        "property_options.property",
        "properties",
        "property_options.property_id = properties.id")
      .where("properties.section_id =:sectionId", { sectionId: sectionId })
      .andWhere("property_options.property_id =:propertyId", { propertyId: propertyId })
      .getOne();

    if (propertyOptionExists && name) {
      propertyOptionExists.name = name;
      await this.propertyOptionRepository.save(propertyOptionExists);
    } else if (!propertyOptionExists) {
      const property = new PropertyOption();
      property.property_id = propertyId;
      property.option_id = optionId;
      property.name = name;

      await this.propertyOptionRepository.save(property);
    }
  }

  private async getPropertyOptions(property, sectionId: number) {
    const propertyRecord = await this.propertyRepository.findOne({
      where: {
        section_id: sectionId,
        property_id: property.id,
      },
    });

    let options;
    switch (property.type) {
      case NotionPropertyType.SELECT:
        options = property.select.options;
        break;
      case NotionPropertyType.MULTI_SELECT:
        options = property.multi_select.options;
        break;
      case NotionPropertyType.STATUS:
        options = property.status.options;
        break;
      case NotionPropertyType.RELATION:
        const propertyId = propertyRecord.id;
        const optionId = property.relation.database_id;
        const optionName = null;
        return this.savePropertyOption(propertyId, optionId, sectionId, optionName);
      default:
        return;
    }
    const propertyOptions = options.map(option => ({
      propertyId: propertyRecord.id,
      optionId: option.id,
      optionName: option.name,
      sectionId: sectionId,
    }));

    await Promise.all(propertyOptions.map(option =>
      this.savePropertyOption(option.propertyId, option.optionId, option.sectionId, option.optionName),
    ));
    return;
  }

  private async saveProperty(id: string, name: string, type: number, sectionId: number) {
    const propertyExists = await this.propertyRepository.findOne({ where: { section_id: sectionId, property_id: id } });
    if (propertyExists) {
      propertyExists.name = name;
      propertyExists.type = type;
      await this.propertyRepository.save(propertyExists);
    } else {
      const property = new Property();
      property.section_id = sectionId;
      property.property_id = id;
      property.name = name;
      property.type = type;

      await this.propertyRepository.save(property);
    }
  }

  private getTitle(pageProperty: Record<PropertyKey, any>, titleId: string): string {
    try {
      const property = pageProperty.find(prop => prop.id === titleId);
      return property.title.map(t => t.plain_text ?? "").join("");
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  }

  private getAssignee(pageProperty: Record<PropertyKey, any>, assigneeId: string): string[] {
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

  private getDue(pageProperty: Record<PropertyKey, any>, dueId: string): Date {
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

  private getSections(pageProperty: Record<PropertyKey, any>, sectionId: string): string[] {
    try {
      const property = pageProperty.find(prop => prop.id === sectionId);
      if (property.type === "relation") {
        return property.relation.map(section => section.id);
      } else if (property.type === "select") {
        return property.select.id;
      } else if (property.type === "multi_select") {
        return property.multi_select.map(section => section.id);
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return [];
    }
  }

  private async getNotionSectionIds(company: Company, todoApp: TodoApp, labelIds: string[]): Promise<number[]> {
    const registeredSectionLabels = await this.sectionRepository.find({
      where: {
        company_id: company.id,
        todoapp_id: todoApp.id,
      },
    });
    const registeredLabelRecords = registeredSectionLabels.map(section => {
      return { sectionId: section.id, labelId: section.label_id };
    });

    const results: number[] = [];
    registeredLabelRecords.forEach(record => {
      if (labelIds.includes(record.labelId)) {
        results.push(record.sectionId);
      }
    });
    return results;
  }

  private async getIsStatus(pageProperty: Record<PropertyKey, any>, isFlagId: string): Promise<boolean> {
    try {
      const property = pageProperty.find(prop => prop.id === isFlagId);
      if (property.type === "checkbox") {
        return property.checkbox;
      } else if (property.type === "formula" && property.formula.type === "boolean") {
        return property.formula.boolean;
      } else if (property.type === "status") {
        const optionId: string = property.status.id;

        const usagePropertyOption = await this.propertyOptionRepository
          .createQueryBuilder("property_options")
          .leftJoin(
            "property_options.property",
            "properties",
            "property_options.property_id = properties.id")
          .where("properties.property_id =:propertyId", { propertyId: property.id })
          .andWhere("property_options.option_id =:optionId", { optionId: optionId })
          .andWhere("property_options.usage IS NOT NULL")
          .getOne();
        return usagePropertyOption !== null && optionId === usagePropertyOption.option_id;
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
          const lastUpdatedDate = await this.commonRepository.getLastUpdatedDate(company, todoapp);
          lastUpdatedDate.setDate(lastUpdatedDate.getDate());
          const lastUpdatedStr = lastUpdatedDate.toISOString().slice(0, 10);

          let response = await this.notionRequest.databases.query({
            database_id: section.board_id,
            filter: {
              timestamp: "last_edited_time",
              last_edited_time: { on_or_after: lastUpdatedStr },
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
    const filteredProperty = usageProperty.filter(property => property.usage === usageId);
    const result = filteredProperty.find(property => pagePropertyIds.includes(property.property_id));
    return result ? result.property_id : null;
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
        todoappRegId: pageId,
        name,
        assignees: this.getAssignee(pageProperty, propertyId.assignee),
        sections: this.getSections(pageProperty, propertyId.section),
        sectionIds: [],
        deadline: this.getDue(pageProperty, propertyId.due),
        isDone: await this.getIsStatus(pageProperty, propertyId.isDone),
        isClosed: await this.getIsStatus(pageProperty, propertyId.isClosed),
        todoappRegUrl: this.getString(pageInfo, "url"),
        deadlineReminder: null,
        createdBy: this.getString(pageInfo, "created_by"),
        createdById: null,
        createdAt: this.getDate(pageInfo, "created_time"),
        lastEditedBy: this.getString(pageInfo, "last_edited_by"),
        lastEditedById: null,
        lastEditedAt: this.getDate(pageInfo, "last_edited_time"),
      };
      pageTodo.sectionIds = await this.getNotionSectionIds(company, todoapp, pageTodo.sections);
      pageTodo.createdById = await this.getEditedById(company.users, todoapp.id, pageTodo.createdBy);
      pageTodo.lastEditedById = await this.getEditedById(company.users, todoapp.id, pageTodo.lastEditedBy);

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
    const users = await this.todoUserRepository.getUserAssignTask(company.users, pageTodo.assignees);

    const page: ITodoTask<INotionTask> = {
      todoTask: pageTodo,
      company,
      todoapp,
      todoAppUser,
      sections: sections.filter(section => pageTodo.sectionIds.includes(section.id)),
      users,
    };

    const taskFound = todoTasks.find(task => task.todoTask?.todoappRegId === pageTodo.todoappRegId);
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

      const savedTodos = await this.todoRepository.createQueryBuilder("todos")
        .leftJoinAndSelect("todos.todoUsers", "todo_users")
        .leftJoinAndSelect("todo_users.user", "users")
        .leftJoinAndSelect("users.chattoolUsers", "chat_tool_users")
        .leftJoinAndSelect("todos.todoSections", "todo_sections")
        .leftJoinAndSelect("todo_sections.section", "sections")
        .leftJoinAndSelect("todos.company", "company")
        .leftJoinAndSelect("company.implementedChatTools", "implemented_chat_tools")
        .leftJoinAndSelect("implemented_chat_tools.chattool", "chat_tool")
        .getMany();
      await this.todoRepository.upsert(todos, []);
      await Promise.all([
        this.todoHistoryRepository.saveTodoHistories(savedTodos, dataTodoHistories, notify),
        this.todoUserRepository.saveTodoUsers(dataTodoUsers),
        this.todoSectionRepository.saveTodoSections(dataTodoSections),
        // await this.lineQueueRepository.pushTodoLineQueues(dataLineQueues),
      ]);
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
    const todo: Todo = await this.todoRepository.findOneBy({ todoapp_reg_id: todoTask.todoappRegId });
    const deadline = todoTask.deadline ? toJapanDateTime(todoTask.deadline) : null;

    const todoData = new Todo();
    todoData.id = todo?.id ?? null;
    todoData.name = todoTask.name;
    todoData.todoapp_id = todoapp.id;
    todoData.todoapp_reg_id = todoTask.todoappRegId;
    todoData.todoapp_reg_url = todoTask.todoappRegUrl;
    todoData.todoapp_reg_created_by = todoTask.createdById;
    todoData.todoapp_reg_created_at = toJapanDateTime(todoTask.createdAt);
    todoData.company_id = company.id;
    todoData.deadline = deadline;
    todoData.is_done = todoTask.isDone;
    todoData.is_reminded = todo?.is_reminded ?? false;
    todoData.is_closed = todoTask.isClosed;
    todoData.delayed_count = todo?.delayed_count ?? 0;
    todoData.reminded_count = todo?.reminded_count ?? 0;

    if (users.length) {
      dataTodoUsers.push({ todoId: todoTask.todoappRegId, users });
    }

    if (sections.length) {
      dataTodoSections.push({ todoId: todoTask.todoappRegId, sections });
    }

    dataTodoHistories.push({
      todoId: todoTask.todoappRegId,
      name: todoTask.name,
      deadline: todoTask.deadline,
      users: users,
      isDone: todoTask.isDone,
      isClosed: todoTask.isClosed,
      todoappRegUpdatedAt: todoTask.lastEditedAt,
      editedBy: todoTask.lastEditedById,
    });

    //update deadline task
    if (deadline || todoData.is_done) {
      const isDeadlineChanged = !moment(deadline).isSame(todo?.deadline);
      const isDoneChanged = todo?.is_done !== todoData.is_done;
      if (isDeadlineChanged || isDoneChanged) {
        dataTodoUpdates.push({
          todoId: todoTask.todoappRegId,
          dueTime: todo?.deadline,
          newDueTime: deadline,
          updateTime: toJapanDateTime(todoTask.lastEditedAt),
        });
      }
      if (!todoData.is_done && taskRemind.delayedCount > 0 && (isDeadlineChanged || !todoData.delayed_count)) {
        todoData.delayed_count = todoData.delayed_count + 1;
      }
    }
    dataTodos.push(todoData);
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

  public async postDailyReportByUser(items: IDailyReportItems, sections: Section[], users: User[]) {
    const today = new Date();
    const createdAt = today.toISOString().slice(0, 10);
    const databaseId = "cbfe6313401149948f8300308054b6f8"; //TODO:DBに格納して取得できるようにする
    const reportId = "a167f832-53af-467e-80ce-f0ae1afb361d"; //TODO:DBに格納して取得できるようにする

    const postOperation = [];
    for (const user of users) {
      if (!user || !user.todoAppUsers) {
        continue;
      }
      const filteredItems = SlackMessageBuilder.filterTodosByUser(items, sections ,user);
      const notionUsers = user.todoAppUsers.filter((tu) => tu.todoApp.todo_app_code === TodoAppCode.NOTION);
      if (notionUsers.length) {
        for (const notionUser of notionUsers) {
          postOperation.push(
            this.notionPageBuilder.createDailyReportByUser(databaseId, notionUser, filteredItems, createdAt, reportId)
              .then((page) => this.notionRequest.pages.create(page)),
          );
        }
      }
    }
    const response:CreatePageResponse[] = await Promise.all(postOperation);
  }
}