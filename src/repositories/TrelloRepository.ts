import { Repository } from "typeorm";
import moment from "moment";
import { Service, Container } from "typedi";

import Todo from "@/entities/transactions/Todo";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import TodoApp from "@/entities/masters/TodoApp";
import Company from "@/entities/settings/Company";
import Section from "@/entities/settings/Section";
import User from "@/entities/settings/User";

import TodoUserRepository from "./modules/TodoUserRepository";
import TodoUpdateHistoryRepository from "./modules/TodoUpdateHistoryRepository";
import TodoHistoryRepository from "./modules/TodoHistoryRepository";
import CommonRepository from "./modules/CommonRepository";
import LineMessageQueueRepository from "./modules/LineMessageQueueRepository";
import TodoSectionRepository from "./modules/TodoSectionRepository";

import { toJapanDateTime, diffDays } from "@/utils/common";
import logger from "@/logger/winston";
import TrelloRequest from "@/services/TrelloRequest";
import AppDataSource from "@/config/data-source";
import { LoggerError } from "@/exceptions";
import { ITodoTask, ITodoUserUpdate, ITodoUpdate, IRemindTask, ITodoSectionUpdate, ITodoHistory } from "@/types";
import { ITrelloTask, ITrelloActivityLog, ITrelloList } from "@/types/trello";

@Service()
export default class TrelloRepository {
  private trelloRequest: TrelloRequest;
  private todoRepository: Repository<Todo>;
  private todoUpdateRepository: TodoUpdateHistoryRepository;
  private todoHistoryRepository: TodoHistoryRepository;
  private lineQueueRepository: LineMessageQueueRepository;
  private todoAppUserRepository: Repository<TodoAppUser>;
  private todoUserRepository: TodoUserRepository;
  private todoSectionRepository: TodoSectionRepository;
  private commonRepository: CommonRepository;

  constructor() {
    this.trelloRequest = Container.get(TrelloRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = Container.get(TodoUpdateHistoryRepository);
    this.todoHistoryRepository = Container.get(TodoHistoryRepository);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
    this.todoUserRepository = Container.get(TodoUserRepository);
    this.todoSectionRepository = Container.get(TodoSectionRepository);
    this.commonRepository = Container.get(CommonRepository);
  }

  public async syncTaskByUserBoards(company: Company, todoapp: TodoApp, notify: boolean = false): Promise<void> {
    const companyId = company.id;
    const todoappId = todoapp.id;

    await this.updateUsersTrello(company.users, todoappId);
    const sections = await this.commonRepository.getSections(companyId, todoappId);

    await this.getUserCardBoards(sections, company, todoapp, notify);
  }

  private async getUserCardBoards(
    sections: Section[],
    company: Company,
    todoapp: TodoApp,
    notify: boolean = false
  ): Promise<void> {
    try {
      const todoTasks: ITodoTask<ITrelloTask>[] = [];
      for (const section of sections) {
        await this.getCardBoards(section.boardAdminUser, section, todoTasks, company, todoapp);
      }

      await this.filterUpdateCards(todoTasks, notify);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  }

  private async getCardBoards(
    boardAdminuser: User,
    section: Section,
    todoTasks: ITodoTask<ITrelloTask>[],
    company: Company,
    todoapp: TodoApp,
  ): Promise<void> {
    if (!boardAdminuser?.todoAppUsers.length) return;

    for (const todoAppUser of boardAdminuser.todoAppUsers) {
      if (todoAppUser.api_key && todoAppUser.api_token && section.board_id) {
        try {
          const trelloAuth = this.trelloRequest.generateAuth(todoAppUser);
          const cardTodos: ITrelloTask[] = await this.trelloRequest.getAllCardsFromBoard(section.board_id, trelloAuth);
          const archiveLists: ITrelloList[] = await this.trelloRequest.getArchiveListsFromBoard(section.board_id, trelloAuth);
          const archiveListIds: string[] = archiveLists.map(list => list.id);
          const activityLogs: ITrelloActivityLog[] = await this.trelloRequest.getActivityLogFromBoard(section.board_id, trelloAuth);
          const createCards = activityLogs.filter(log => log.type === "createCard");

          await Promise.all(cardTodos.map(todoTask => this.addTodoTask(
            todoTask,
            boardAdminuser,
            section,
            todoTasks,
            company,
            todoapp,
            todoAppUser,
            archiveListIds,
            createCards
          )));
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  }

  private async addTodoTask(
    todoTask: ITrelloTask,
    _boardAdminuser: User,
    section: Section,
    todoTasks: ITodoTask<ITrelloTask>[],
    company: Company,
    todoapp: TodoApp,
    todoAppUser: TodoAppUser,
    archiveListIds: string[],
    createCards: ITrelloActivityLog[],
  ): Promise<void> {
    const users = await this.todoUserRepository.getUserAssignTask(company.users, todoTask.idMembers);

    if (archiveListIds.length) {
      for (const id of archiveListIds) {
        if (todoTask.idList === id) {
          todoTask.closed = true;
        }
      }
    }

    const sameCard = createCards.find(card => card.data.card.id === todoTask.id);
    if (sameCard) {
      todoTask.idMemberCreator = sameCard.idMemberCreator;
      todoTask.createdAt = sameCard.date;
    }

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

  private async updateUsersTrello(usersCompany: User[], todoappId: number): Promise<void> {
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
  }

  private async updateTrelloUser(todoAppUsers: TodoAppUser[]): Promise<any> {
    for (const todoAppUser of todoAppUsers) {
      if (todoAppUser.api_key && todoAppUser.api_token) {
        try {
          const trelloAuth = this.trelloRequest.generateAuth(todoAppUser);

          const me = await this.trelloRequest.getMyInfo(trelloAuth);
          todoAppUser.user_app_id = me?.id;
          await this.todoAppUserRepository.save(todoAppUser);
        } catch (err) {
          logger.error(new LoggerError(err.message));
        }
      }
    }
  }

  private async filterUpdateCards(cardTodos: ITodoTask<ITrelloTask>[], notify: boolean = false): Promise<void> {
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

    await this.createTodo(cards, notify);
  }

  private async createTodo(taskReminds: IRemindTask<ITrelloTask>[], notify: boolean = false): Promise<void> {
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
      await this.todoRepository.upsert(dataTodos, []);
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
    taskRemind: IRemindTask<ITrelloTask>,
    dataTodos: Todo[],
    dataTodoUpdates: ITodoUpdate[],
    dataTodoHistories: ITodoHistory[],
    dataTodoUsers: ITodoUserUpdate[],
    dataTodoSections: ITodoSectionUpdate[],
  ): Promise<void> {
    const cardTodo = taskRemind.cardTodo;
    const { users, todoTask, todoapp, company, sections } = cardTodo;

    const todo: Todo = await this.todoRepository.findOneBy({
      todoapp_reg_id: todoTask.id,
    });

    const taskDeadLine = todoTask.due ? toJapanDateTime(todoTask.due) : null;
    const taskUpdated = toJapanDateTime(todoTask.dateLastActivity);
    const createdBy = await this.todoAppUserRepository.findOneBy({
      user_app_id: todoTask.idMemberCreator,
    });

    const todoData = new Todo();
    todoData.id = todo?.id || null;
    todoData.name = todoTask.name;
    todoData.todoapp_id = todoapp.id;
    todoData.todoapp_reg_id = todoTask.id;
    todoData.todoapp_reg_url = todoTask.shortUrl;
    todoData.todoapp_reg_created_by = createdBy.employee_id || null;
    todoData.todoapp_reg_created_at = toJapanDateTime(todoTask.createdAt) || taskUpdated;
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
      dataTodoSections.push({ todoId: todoTask.id, sections });
    }

    dataTodoHistories.push({
      todoId: todoTask.id,
      name: todoTask.name,
      deadline: todoTask.due,
      users: users,
      isDone: todoTask.dueComplete,
      isClosed: todoTask.closed,
      todoappRegUpdatedAt: todoTask.dateLastActivity,
    });

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
  }

  public async updateTodo(
    id: string,
    task: Todo,
    todoAppUser: TodoAppUser,
    correctDelayedCount: boolean = false
  ): Promise<void> {
    try {
      const idMembers = task.todoUsers.map(todoUser => {
        const targetTodoAppUser = todoUser.user.todoAppUsers.find(tau => tau.todoapp_id === todoAppUser.todoapp_id);
        return targetTodoAppUser.user_app_id;
      });
      const trelloTask: Partial<ITrelloTask> = {
        id: task.todoapp_reg_id,
        name: task.name,
        closed: task.is_closed,
        dueComplete: task.is_done,
        due: task.deadline,
        idMembers,
      };
      const trelloAuth = this.trelloRequest.generateAuth(todoAppUser);
      await this.trelloRequest.updateCard(id, trelloTask, trelloAuth);

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
  }
}
