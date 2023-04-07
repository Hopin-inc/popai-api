import { Service, Container } from "typedi";

import Todo from "@/entities/transactions/Todo";
import TodoAppUser from "@/entities/settings/TodoAppUser";
import TodoApp from "@/entities/masters/TodoApp";
import Company from "@/entities/settings/Company";
import Section from "@/entities/settings/Section";
import User from "@/entities/settings/User";

import { toJapanDateTime, diffDays } from "@/utils/common";
import logger from "@/logger/winston";
import TrelloRequest from "@/services/TrelloRequest";
import { ITodoTask, ITodoUserUpdate, IRemindTask, ITodoSectionUpdate, ITodoHistory } from "@/types";
import { ITrelloTask, ITrelloActivityLog, ITrelloList } from "@/types/trello";
import { TodoRepository } from "@/repositories/transactions/TodoRepository";
import { TodoUserRepository } from "@/repositories/transactions/TodoUserRepository";
import { TodoAppUserRepository } from "@/repositories/settings/TodoAppUserRepository";
import { SectionRepository } from "@/repositories/settings/SectionRepository";
import { TodoSectionRepository } from "@/repositories/transactions/TodoSectionRepository";

import TodoHistoryService from "@/services/TodoHistoryService";

@Service()
export default class TrelloRepository {
  private trelloRequest: TrelloRequest;
  private todoHistoryService: TodoHistoryService;

  constructor() {
    this.trelloRequest = Container.get(TrelloRequest);
    this.todoHistoryService = Container.get(TodoHistoryService);
  }

  public async syncTaskByUserBoards(company: Company, todoapp: TodoApp, notify: boolean = false): Promise<void> {
    const companyId = company.id;
    const todoappId = todoapp.id;

    await this.updateUsersTrello(company.users, todoappId);
    const sections = await SectionRepository.getSections(companyId, todoappId);

    await this.getUserCardBoards(sections, company, todoapp, notify);
  }

  private async getUserCardBoards(
    sections: Section[],
    company: Company,
    todoapp: TodoApp,
    notify: boolean = false,
  ): Promise<void> {
    try {
      const todoTasks: ITodoTask<ITrelloTask>[] = [];
      for (const section of sections) {
        await this.getCardBoards(section.boardAdminUser, section, todoTasks, company, todoapp);
      }

      await this.filterUpdateCards(todoTasks, notify);
    } catch (err) {
      logger.error(err);
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
            createCards,
          )));
        } catch (err) {
          logger.error(err);
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
    const users = await TodoUserRepository.getUserAssignTask(company.users, todoTask.idMembers);

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
          await TodoAppUserRepository.save(todoAppUser);
        } catch (err) {
          logger.error(err);
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
      const dataTodoHistories: ITodoHistory[] = [];
      const dataTodoUsers: ITodoUserUpdate[] = [];
      const dataTodoSections: ITodoSectionUpdate[] = [];

      await Promise.all(taskReminds.map(taskRemind => {
        return this.addDataTodo(taskRemind, dataTodos, dataTodoHistories, dataTodoUsers, dataTodoSections);
      }));

      const todoIds: string[] = taskReminds.map(t => t.cardTodo.todoTask.id);
      const savedTodos = await TodoRepository.getTodoHistories(todoIds);
      await TodoRepository.upsert(dataTodos, []);
      await Promise.all([
        this.todoHistoryService.saveTodoHistories(savedTodos, dataTodoHistories, notify),
        await TodoUserRepository.saveTodoUsers(dataTodoUsers),
        TodoSectionRepository.saveTodoSections(dataTodoSections),
        // await LineMessageQueueRepository.pushTodoLineQueues(dataLineQueues),
      ]);
    } catch (error) {
      logger.error(error);
    }
  }

  private async addDataTodo(
    taskRemind: IRemindTask<ITrelloTask>,
    dataTodos: Todo[],
    dataTodoHistories: ITodoHistory[],
    dataTodoUsers: ITodoUserUpdate[],
    dataTodoSections: ITodoSectionUpdate[],
  ): Promise<void> {
    const cardTodo = taskRemind.cardTodo;
    const { users, todoTask, todoapp, company, sections } = cardTodo;

    const todo: Todo = await TodoRepository.findOneBy({ todoapp_reg_id: todoTask.id, });

    const taskDeadLine = todoTask.due ? toJapanDateTime(todoTask.due) : null;
    const taskUpdated = toJapanDateTime(todoTask.dateLastActivity);
    const createdBy = await TodoAppUserRepository.findOneBy({
      user_app_id: todoTask.idMemberCreator,
    });

    const todoData = new Todo(todoTask, company, todoapp, todo, createdBy.employee_id);

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
      todoData.first_assigned_at = todo?.first_assigned_at || taskUpdated;
      dataTodoUsers.push({ todoId: todoTask.id, users });
    }

    dataTodos.push(todoData);
  }

  public async updateTodo(
    id: string,
    task: Todo,
    todoAppUser: TodoAppUser,
    correctDelayedCount: boolean = false,
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

      await TodoRepository.save(task);
    } catch (error) {
      logger.error(error);
    }
  }
}
