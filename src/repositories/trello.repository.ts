import { AppDataSource } from '../config/data-source';
import { User } from '../entify/user.entity';
import { LoggerError } from '../exceptions';
import { Repository } from 'typeorm';
import moment from 'moment';
import logger from './../logger/winston';
import {
  ICompanyBoard,
  ICompanyCondition,
  ITodo,
  ITodoAppUser,
  ITodoTask,
  ITrelloAuth,
  IUser,
} from './../types';
import TrelloRequest from './../libs/trello.request';
import { Service, Container } from 'typedi';
import { Todo } from './../entify/todo.entity';
import LineRepository from './line.repository';
import { TodoUpdateHistory } from './../entify/todoupdatehistory.entity';
import { CompanyBoard } from './../entify/company.board.entity';
import { TodoAppUser } from './../entify/todoappuser.entity';

@Service()
export default class TrelloRepository {
  private userRepository: Repository<User>;
  private companyBoardRepository: Repository<CompanyBoard>;
  private trelloRequest: TrelloRequest;
  private todoRepository: Repository<Todo>;
  private todoUpdateRepository: Repository<TodoUpdateHistory>;
  private lineBotRepository: LineRepository;
  private todoAppUserRepository: Repository<TodoAppUser>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.companyBoardRepository = AppDataSource.getRepository(CompanyBoard);
    this.trelloRequest = Container.get(TrelloRequest);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.todoUpdateRepository = AppDataSource.getRepository(TodoUpdateHistory);
    this.lineBotRepository = Container.get(LineRepository);
    this.todoAppUserRepository = AppDataSource.getRepository(TodoAppUser);
  }

  getCompanyBoard = async (companyId: number, todoappId: number): Promise<ICompanyBoard[]> => {
    const boards: ICompanyBoard[] = await this.companyBoardRepository
      .createQueryBuilder('company_boards')
      .where('company_boards.company_id = :companyId', { companyId })
      .andWhere('company_boards.todoapp_id = :todoappId', { todoappId })
      .getMany();
    return boards;
  };

  getUserTodoApps = async (
    companyId: number,
    todoappId: number,
    hasLineId: boolean = true
  ): Promise<IUser[]> => {
    const query = this.userRepository
      .createQueryBuilder('users')
      .innerJoinAndSelect('users.todoAppUsers', 'todo_app_users')
      .leftJoinAndSelect('users.companyCondition', 'm_company_conditions')
      .where('users.company_id = :companyId', { companyId })
      .andWhere('todo_app_users.todoapp_id = :todoappId', { todoappId });
    if (hasLineId) {
      query.andWhere('todo_app_users.user_app_id IS NOT NULL');
    } else {
      query.andWhere('todo_app_users.user_app_id IS NULL');
    }

    const users: IUser[] = await query.getMany();
    return users;
  };

  remindUsers = async (companyId: number, todoappId: number): Promise<void> => {
    await this.updateUsersLine(companyId, todoappId);
    const companyBoards = await this.getCompanyBoard(companyId, todoappId);

    const users = await this.getUserTodoApps(companyId, todoappId);
    await this.getUserCardBoards(users, companyBoards, companyId, todoappId);
  };

  getUserCardBoards = async (
    users: IUser[],
    companyBoards: ICompanyBoard[],
    companyId: number,
    todoappId: number
  ): Promise<void> => {
    try {
      const todoTasks: ITodoTask[] = [];
      for await (const user of users) {
        for (const board of companyBoards) {
          await this.getCardBoards(user, board, todoTasks, companyId, todoappId);
        }
      }

      await this.filterUpdateCards(todoTasks);
    } catch (err) {
      logger.error(new LoggerError(err.message));
    }
  };

  getCardBoards = async (
    user: IUser,
    board: ICompanyBoard,
    todoTasks: ITodoTask[],
    companyId: number,
    todoappId: number
  ): Promise<void> => {
    if (!user.todoAppUsers.length) return;

    for (const todoAppUser of user.todoAppUsers) {
      if (todoAppUser.api_key && todoAppUser.api_token) {
        const trelloAuth: ITrelloAuth = {
          api_key: todoAppUser.api_key,
          api_token: todoAppUser.api_token,
        };
        const cardTodos = await this.trelloRequest.fetchApi(
          'boards/' + board.board_id + '/cards',
          'GET',
          {},
          trelloAuth
        );

        for (const todoTask of cardTodos) {
          const found = todoTasks.find((task) => task.todoTask?.id === todoTask.id);
          if (!found) {
            const card: ITodoTask = {
              todoTask: todoTask,
              companyId: companyId,
              todoappId: todoappId,
            };
            if (todoTask.idMembers.includes(todoAppUser.user_app_id)) {
              card.user = user;
            }

            todoTasks.push(card);
          }
        }
      }
    }
  };

  updateUsersLine = async (companyId: number, todoappId: number): Promise<void> => {
    const users = await this.getUserTodoApps(companyId, todoappId, false);
    for await (const user of users) {
      if (user.todoAppUsers.length) {
        await this.updateLineUser(user.todoAppUsers);
      }
    }
  };

  updateLineUser = async (todoAppUsers: ITodoAppUser[]): Promise<any> => {
    for (const todoAppUser of todoAppUsers) {
      if (todoAppUser.api_key && todoAppUser.api_token) {
        const trelloAuth: ITrelloAuth = {
          api_key: todoAppUser.api_key,
          api_token: todoAppUser.api_token,
        };

        const me = await this.trelloRequest.fetchApi('members/me', 'GET', {}, trelloAuth);
        todoAppUser.user_app_id = me?.id;
        this.todoAppUserRepository.save(todoAppUser);
      }
    }
  };

  getDayReminds = async (companyCondition: ICompanyCondition[]): Promise<number[]> => {
    const dayReminds: number[] = companyCondition
      .map((s) => s.remind_before_days)
      .filter(Number.isFinite);

    return dayReminds;
  };

  filterUpdateCards = async (cardTodos: ITodoTask[]): Promise<void> => {
    const cardReminds: ITodoTask[] = [];
    const cardNomals: ITodoTask[] = [];

    for (const cardTodo of cardTodos) {
      let hasRemind = false;
      const user = cardTodo.user;
      const todoTask = cardTodo.todoTask;

      if (user?.companyCondition && todoTask.due && !todoTask.dueComplete) {
        const dayReminds: number[] = await this.getDayReminds(user.companyCondition);
        const dateExpired = moment(todoTask.due).startOf('day');
        const dateNow = moment().startOf('day');

        const duration = moment.duration(dateExpired.diff(dateNow));
        const day = duration.asDays();

        if (dayReminds.includes(day)) {
          hasRemind = true;
          cardReminds.push(cardTodo);
        }
      }

      if (!hasRemind) {
        cardNomals.push(cardTodo);
      }
    }

    this.createTodo(cardReminds, true);
    this.createTodo(cardNomals);
  };

  createTodo = async (taskReminds: ITodoTask[], isRemind: boolean = false): Promise<void> => {
    try {
      if (!taskReminds.length) return;
      const dataTodos = [];
      const dataTodoIDUpdates = [];
      const pushUserIds = [];

      for (const taskRemind of taskReminds) {
        const user = taskRemind.user;
        const todoTask = taskRemind.todoTask;
        const todoappId = taskRemind.todoappId;
        const companyId = taskRemind.companyId;

        if (isRemind && user && !pushUserIds.includes(user.id)) {
          // send to admin of user
          pushUserIds.push(user.id);
          await this.lineBotRepository.pushStartReportToAdmin(user);
        }

        const todoData = new Todo();
        todoData.name = todoTask.name;
        todoData.todoapp_id = todoappId;
        todoData.todoapp_reg_id = todoTask.id;
        todoData.todoapp_reg_url = todoTask.shortUrl;
        todoData.todoapp_reg_created_by = null;
        todoData.todoapp_reg_created_at = moment(todoTask.dateLastActivity).toDate();
        todoData.company_id = companyId;
        if (user) {
          todoData.assigned_user_id = user.id;
        }
        todoData.deadline = moment(todoTask.due).toDate();
        todoData.is_done = todoTask.dueComplete;
        todoData.is_reminded = todoTask.dueReminder ? true : false;
        todoData.is_rescheduled = null;
        dataTodos.push(todoData);

        if (isRemind && user) {
          todoData.reminded_count = 1;
          // send Line message
          this.lineBotRepository.pushMessageRemind(user, todoData);
        }

        if (todoTask.dateLastActivity) {
          dataTodoIDUpdates.push({
            todoId: todoTask.id,
            updateTime: moment(todoTask.dateLastActivity).toDate(),
          });
        }
      }

      const response = await this.todoRepository.upsert(dataTodos, []);

      if (response && dataTodoIDUpdates.length) {
        for (const dataUpdate of dataTodoIDUpdates) {
          const todo: ITodo = await this.todoRepository.findOneBy({
            todoapp_reg_id: dataUpdate.todoId,
          });

          if (todo) {
            this.saveTodoHistory(todo, dataUpdate.updateTime);
          }
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };

  saveTodoHistory = async (todo: ITodo, updateTime: Date) => {
    try {
      const todoUpdateData = await this.todoUpdateRepository.findOne({
        where: { todo_id: todo.id },
        order: { id: 'DESC' },
      });

      const taskUpdate = moment(updateTime).format('YYYY-MM-DD HH:mm:ss');
      if (todoUpdateData) {
        const oldDate = moment(todoUpdateData.todoapp_reg_updated_at).format('YYYY-MM-DD HH:mm:ss');
        if (moment(oldDate).isSame(taskUpdate)) {
          return;
        }
      }

      const todoUpdate = new TodoUpdateHistory();
      todoUpdate.todo_id = todo.id;
      todoUpdate.todoapp_reg_updated_at = moment(taskUpdate).toDate();
      this.todoUpdateRepository.save(todoUpdate);
    } catch (error) {
      logger.error(new LoggerError(error.message));
    }
  };
}
