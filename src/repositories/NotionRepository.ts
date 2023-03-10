import { In, IsNull, Not, Repository } from "typeorm";
import { Client } from "@notionhq/client";
import {
  PageObjectResponse,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";
import { Container, Service } from "typedi";
import moment from "moment";

import Todo from "@/entities/transactions/Todo";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import TodoApp from "@/entities/masters/TodoApp";
import Company from "@/entities/settings/Company";
import Section from "@/entities/settings/Section";
import User from "@/entities/settings/User";
import BoardProperty from "@/entities/settings/BoardProperty";
import OptionCandidate from "@/entities/settings/OptionCandidate";
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
import { INotionDailyReport, INotionTask } from "@/types/notion";
import { DocumentToolCode, NotionPropertyType, UsageType } from "@/consts/common";
import NotionPageBuilder from "@/common/NotionPageBuilder";
import SlackMessageBuilder from "@/common/SlackMessageBuilder";
import DailyReportConfig from "@/entities/settings/DailyReportConfig";
import { valueOf } from "../../dist/types";

@Service()
export default class NotionRepository {
  private notionRequest: Client;
  private todoRepository: Repository<Todo>;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private boardPropertyRepository: Repository<BoardProperty>;
  private optionCandidateRepository: Repository<OptionCandidate>;
  private propertyOptionRepository: Repository<PropertyOption>;
  private sectionRepository: Repository<Section>;
  private dailyReportConfigRepository: Repository<DailyReportConfig>;
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
    this.boardPropertyRepository = AppDataSource.getRepository(BoardProperty);
    this.optionCandidateRepository = AppDataSource.getRepository(OptionCandidate);
    this.propertyOptionRepository = AppDataSource.getRepository(PropertyOption);
    this.sectionRepository = AppDataSource.getRepository(Section);
    this.dailyReportConfigRepository = AppDataSource.getRepository(DailyReportConfig);
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
        await this.commonRepository.saveProperty(id, name, type, sectionId);
        return this.getOptionCandidates(property, sectionId);
      }));
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  }

  private async getOptionCandidates(property, sectionId: number) {
    const propertyRecord = await this.boardPropertyRepository.findOneBy({
      section_id: sectionId,
      property_id: property.id,
    });

    switch (property.type) {
      case NotionPropertyType.SELECT:
      case NotionPropertyType.MULTI_SELECT:
      case NotionPropertyType.STATUS:
        const typeKey = Object.keys(NotionPropertyType).find(key => NotionPropertyType[key] === property.type);
        const options = property[typeKey.toLowerCase()].options;
        await Promise.all(options.map(option => {
          this.commonRepository.saveOptionCandidate(propertyRecord.id, option.id, sectionId, option.name);
        }));
        break;
      case NotionPropertyType.RELATION:
        await this.commonRepository.saveOptionCandidate(propertyRecord.id, property.relation.database_id, sectionId);
        break;
      default:
        await this.commonRepository.savePropertyOption(propertyRecord.id);
        break;
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

          let response = await this.notionRequest.databases.query({
            database_id: section.board_id,
            filter: lastUpdatedDate
              ? {
                timestamp: "last_edited_time",
                last_edited_time: { on_or_after: lastUpdatedDate.toISOString().slice(0, 10) },
              }
              : undefined,
          });

          const pages = response.results;
          while (response.has_more) {
            response = await this.notionRequest.databases.query({
              database_id: section.board_id,
              start_cursor: response.next_cursor,
            });
            pages.push(...response.results);
          }

          const usagePropertyOptions = await this.propertyOptionRepository.find({
            relations: ["boardProperty", "optionCandidate"],
            where: {
              boardProperty: { section_id: section.id },
              usage: Not(IsNull()),
            },
          });

          const pageIds: string[] = pages.map(page => page.id);
          const pageTodos: INotionTask[] = [];

          await Promise.all(pageIds.map(pageId => {
            return this.getPages(pageId, pageTodos, company, section, todoapp, usagePropertyOptions);
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

  private getUsageProperty(propertyOptions: PropertyOption[], pagePropertyIds: string[], usageId: number) {
    const result = propertyOptions.find(
      propOpt => propOpt.usage === usageId
        && pagePropertyIds.includes(propOpt.boardProperty.property_id));
    return result ? result.boardProperty.property_id : null;
  }

  private async getPages(
    pageId: string,
    pageTodos: INotionTask[],
    company: Company,
    section: Section,
    todoapp: TodoApp,
    usagePropertyOptions: PropertyOption[],
  ): Promise<void> {
    const pageInfo = await this.notionRequest.pages.retrieve({ page_id: pageId }) as PageObjectResponse;
    const pageProperty = Object.keys(pageInfo.properties).map((key) => pageInfo.properties[key]) as Record<any, any>;
    if (pageProperty) {
      const pagePropertyIds = pageProperty.map((obj) => obj.id);
      const propertyId = {
        title: this.getUsageProperty(usagePropertyOptions, pagePropertyIds, UsageType.TITLE),
        section: this.getUsageProperty(usagePropertyOptions, pagePropertyIds, UsageType.SECTION),
        assignee: this.getUsageProperty(usagePropertyOptions, pagePropertyIds, UsageType.ASSIGNEE),
        due: this.getUsageProperty(usagePropertyOptions, pagePropertyIds, UsageType.DUE),
        isDone: this.getUsageProperty(usagePropertyOptions, pagePropertyIds, UsageType.IS_DONE),
        isClosed: this.getUsageProperty(usagePropertyOptions, pagePropertyIds, UsageType.IS_CLOSED),
      };

      const name = this.getTitle(pageProperty, propertyId.title);
      if (!name) return;

      const [isDone, isClosed, createdBy, lastEditedBy, createdAt, lastEditedAt] =
        await Promise.all([
          this.getIsStatus(pageProperty, propertyId.isDone, UsageType.IS_DONE),
          this.getIsStatus(pageProperty, propertyId.isClosed, UsageType.IS_CLOSED),
          this.getDefaultStr(pageInfo, "created_by"),
          this.getDefaultStr(pageInfo, "last_edited_by"),
          this.getDefaultDate(pageInfo, "created_time"),
          this.getDefaultDate(pageInfo, "last_edited_time"),
        ]);

      const pageTodo: INotionTask = {
        todoappRegId: pageId,
        name,
        sections: this.getOptionIds(pageProperty, propertyId.section),
        assignees: this.getOptionIds(pageProperty, propertyId.assignee),
        deadline: this.getDue(pageProperty, propertyId.due),
        isDone: isDone,
        isClosed: isClosed,
        todoappRegUrl: this.getDefaultStr(pageInfo, "url"),
        createdBy: createdBy,
        lastEditedBy: lastEditedBy,
        createdAt: createdAt,
        lastEditedAt: lastEditedAt,
        sectionIds: [],
        createdById: null,
        lastEditedById: null,
        deadlineReminder: null,
      };

      const [sectionIds, createdById, lastEditedById] = await Promise.all([
        this.getSectionIds(company, todoapp, pageTodo.sections),
        this.getEditedById(company.users, todoapp.id, pageTodo.createdBy),
        this.getEditedById(company.users, todoapp.id, pageTodo.lastEditedBy),
      ]);

      pageTodo.sectionIds = sectionIds;
      pageTodo.createdById = createdById;
      pageTodo.lastEditedById = lastEditedById;

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
      sections: sections.filter(section => pageTodo.sectionIds?.includes(section.id)),
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
      const isDoneProperty = await this.boardPropertyRepository.findOneBy({
        section_id: In(task.company.sections.map(section => section.id)),
        // usage: UsageType.IS_DONE,
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

  public async postDailyReportByUser(
    items: IDailyReportItems,
    company: Company,
    sections: Section[],
    users: User[],
  ): Promise<INotionDailyReport[]> {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const configRecord = await this.dailyReportConfigRepository.findOneBy({ company_id: company.id });
      const reportId = "a167f832-53af-467e-80ce-f0ae1afb361d"; //TODO:DBに格納して取得できるようにする

      const postOperations = [];
      users.map(user => {
        const itemsByUser = SlackMessageBuilder.filterTodosByUser(items, sections, user);
        const docToolUsers = user.documentToolUsers.find((du) => du.documentTool.tool_code === DocumentToolCode.NOTION);
        postOperations.push(
          this.notionPageBuilder.createDailyReportByUser(configRecord.database, docToolUsers, itemsByUser, today, reportId)
            .then((page) => this.notionRequest.pages.create(page)),
        );
      });
      const response = await Promise.all(postOperations) as PageObjectResponse[];

      const pageInfo = response.flatMap(page => {
        const people = Object.values(page.properties).find(prop => prop.type === "people");
        if (people && people.type === "people") {
          const peopleProps = people ? people.people.filter(person => person.id) : [];
          return peopleProps.map(prop => ({
            pageId: page.id,
            docAppRegUrl: page.url,
            assignee: prop.id,
          })) as INotionDailyReport[];
        }
        return [];
      });
      return pageInfo;
    } catch (error) {
      console.error(error);
      logger.error(new LoggerError(error.message));
    }
  }

  private getTitle(
    pageProperty: Record<PropertyKey, any>,
    titleId: string,
  ): string {
    try {
      const property = pageProperty.find(prop => prop.id === titleId);
      return property.title.map(t => t.plain_text ?? "").join("");
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  }

  private getDue(
    pageProperty: Record<PropertyKey, any>,
    dueId: string,
  ): Date {
    try {
      const property = pageProperty.find(prop => prop.id === dueId);
      switch (property.type) {
        case "date":
          if (property.date) {
            const date = property.date;
            return new Date(date.end ? date.end : date.start);
          }
          break;
        case "formula":
          if (property.formula.type === "date" && property.formula.date) {
            const date = property.formula.date;
            return new Date(date.end ? date.end : date.start);
          }
          break;
        default:
          break;
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
      return;
    }
  }

  private getOptionIds(
    pageProperty: Record<PropertyKey, any>,
    sectionId: string,
  ): string[] {
    try {
      const property = pageProperty.find(prop => prop.id === sectionId);
      switch (property.type) {
        case "relation":
          return property.relation.map(relation => relation.id);
        case "select":
          return [property.select?.id];
        case "multi_select":
          return property.multi_select.map(select => select.id);
        case "people":
          return property.people.map(person => person.id);
        default:
          return null;
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  }

  private async getIsStatus(
    pageProperty: Record<PropertyKey, any>,
    propId: string,
    usageId: valueOf<typeof UsageType>,
  ): Promise<boolean> {
    try {
      const property = pageProperty.find(prop => prop.id === propId);
      switch (property.type) {
        case "checkbox":
          return property.checkbox;
        case "formula":
          return property.formula.type === "boolean" ? property.formula.boolean : null;
        case "status":
          return !!(await this.propertyOptionRepository.findOne({
            relations: ["optionCandidate"],
            where: {
              optionCandidate: { option_id: property.status?.id },
              usage: usageId,
            },
          }));
        case "select":
          return !!(await this.propertyOptionRepository.findOne({
            relations: ["optionCandidate"],
            where: {
              optionCandidate: { option_id: property.select?.id },
              usage: usageId,
            },
          }));
        default:
          break;
      }
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  }

  private async getSectionIds(
    company: Company,
    todoApp: TodoApp,
    labelIds: string[],
  ): Promise<number[]> {
    if (labelIds) {
      const registeredLabelRecords = await this.sectionRepository.find({
        where: {
          company_id: company.id,
          todoapp_id: todoApp.id,
          label_id: In(labelIds),
        },
        select: ["id"],
      });

      return registeredLabelRecords.map(record => record.id);
    }
  }

  private async getEditedById(
    usersCompany: User[],
    todoappId: number,
    editedBy: string,
  ): Promise<number> {
    const filteredUsers = usersCompany.filter(user => user.todoAppUsers.some(todoAppUser =>
      todoAppUser.todoapp_id === todoappId && todoAppUser.user_app_id === editedBy,
    ));

    return filteredUsers.length ? filteredUsers[0].id : undefined;
  }

  private getDefaultStr(
    pageInfo: PageObjectResponse,
    type: string,
  ): string {
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

  private getDefaultDate(
    pageInfo: PageObjectResponse,
    propName: string,
  ): Date {
    try {
      const dateStr = pageInfo[propName];
      return new Date(dateStr);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  }
}