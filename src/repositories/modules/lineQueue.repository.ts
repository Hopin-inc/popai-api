import Container, { Service } from "typedi";
import { Repository } from "typeorm";
import moment from "moment";
import { AppDataSource } from "../../config/dataSource";
import { LineMessageQueue } from "../../entify/lineMessageQueue";
import { ChatToolCode, Common, LineMessageQueueStatus } from "../../const/common";
import { diffDays, toJapanDateTime } from "../../utils/common";
import { Todo } from "../../entify/todo.entity";
import { ICompany } from "../../types";
import { ChatToolUser } from "../../entify/chattool.user.entity";
import CommonRepository from "./common.repository";
import { Company } from "../../entify/company.entity";
import { User } from "../../entify/user.entity";

@Service()
export default class LineQueueRepository {
  private linequeueRepository: Repository<LineMessageQueue>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;

  constructor() {
    this.linequeueRepository = AppDataSource.getRepository(LineMessageQueue);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.commonRepository = Container.get(CommonRepository);
  }

  updateStatusOfOldQueueTask = async (): Promise<void> => {
    await this.updateStatusOldQueueTask(
      LineMessageQueueStatus.NOT_SEND,
      LineMessageQueueStatus.NOT_SEND_TIMEOUT
    );

    await this.updateStatusOldQueueTask(
      LineMessageQueueStatus.WAITING_REPLY,
      LineMessageQueueStatus.NOT_REPLY_TIMEOUT
    );
  };

  createTodayQueueTask = async (company: Company, chattoolUsers: ChatToolUser[]): Promise<any> => {
    const todos: Todo[] = await this.getRemindTodoTask(company);
    await this.createLineQueueMessage(company, chattoolUsers, todos);
  };

  createTodayQueueTaskForUser = async (
    chattoolUsers: ChatToolUser[],
    user: User,
    company: ICompany
  ): Promise<any> => {
    const todos: Todo[] = await this.getRemindTodoTask(company, user);
    await this.createLineQueueMessage(company, chattoolUsers, todos);
  };

  createLineQueueMessage = async (
    company: ICompany,
    chattoolUsers: ChatToolUser[],
    todos: Todo[]
  ): Promise<void> => {
    const dayReminds: number[] = await this.commonRepository.getDayReminds(
      company.companyConditions
    );
    const today = toJapanDateTime(new Date());

    const dataLineQueues: LineMessageQueue[] = [];

    todos.forEach((todo) => {
      const dayDurations = diffDays(todo.deadline, today);

      if (dayReminds.includes(dayDurations)) {
        for (const todoUser of todo.todoUsers) {
          company.chattools.forEach(async (chattool) => {
            if (chattool.tool_code == ChatToolCode.LINE) {
              const chatToolUser = chattoolUsers.find(
                (chattoolUser) =>
                  chattoolUser.chattool_id == chattool.id &&
                  chattoolUser.user_id == todoUser.user_id
              );

              if (chatToolUser) {
                const lineQueueData = new LineMessageQueue();
                lineQueueData.todo_id = todo.id;
                lineQueueData.user_id = todoUser.user_id;
                lineQueueData.remind_date = moment(today)
                  .startOf("day")
                  .toDate();
                lineQueueData.created_at = today;

                dataLineQueues.push(lineQueueData);
              }
            }
          });
        }
      }
    });

    if (dataLineQueues.length) {
      await this.linequeueRepository.upsert(dataLineQueues, []);
    }
  };

  getRemindTodoTask = async (company: ICompany, user?: User): Promise<Todo[]> => {
    const today = toJapanDateTime(new Date());
    const dayReminds: number[] = await this.commonRepository.getDayReminds(
      company.companyConditions
    );

    const minValue = dayReminds.reduce(function(prev, curr) {
      return prev < curr ? prev : curr;
    });
    const maxValue = dayReminds.reduce(function(prev, curr) {
      return prev > curr ? prev : curr;
    });

    const minDate = moment(today)
      .add(-maxValue, "days")
      .startOf("day")
      .toDate();

    const maxDate = moment(today)
      .add(-minValue + 1, "days")
      .startOf("day")
      .toDate();

    const query = this.todoRepository
      .createQueryBuilder("todos")
      .leftJoinAndSelect("todos.todoUsers", "todo_users")
      .leftJoinAndSelect("todo_users.user", "users")
      .where("todos.is_done = :done", { done: false })
      .andWhere("todos.is_closed = :closed", { closed: false })
      .andWhere("todos.company_id = :company_id", { company_id: company.id })
      .andWhere("todos.reminded_count < :reminded_count", { reminded_count: Common.remindMaxCount })
      .andWhere("todos.deadline >= :min_date", { min_date: minDate })
      .andWhere("todos.deadline <= :max_date", { max_date: maxDate })
      .andWhere("todo_users.deleted_at IS NULL");

    if (user) {
      query.andWhere("todo_users.user_id = :user_id", { user_id: user.id });
    }

    return await query.getMany();
  };

  getWaitingQueueTask = async (userId: number): Promise<LineMessageQueue> => {
    return await this.linequeueRepository.findOne({
      where: {
        user_id: userId,
        status: LineMessageQueueStatus.WAITING_REPLY,
        remind_date: moment(toJapanDateTime(new Date()))
          .startOf("day")
          .toDate(),
      },
      relations: ["todo.todoUsers.user.todoAppUsers", "user", "message", "todo.todoapp"],
    });
  };

  getFirstQueueTaskForSendLine = async (userId: number): Promise<LineMessageQueue> => {
    return await this.linequeueRepository.findOne({
      relations: ["todo", "user"],
      where: {
        user_id: userId,
        status: LineMessageQueueStatus.NOT_SEND,
        remind_date: moment(toJapanDateTime(new Date()))
          .startOf("day")
          .toDate(),
      },
    });
  };

  saveQueue = async (queue: LineMessageQueue) => {
    return await this.linequeueRepository.save(queue);
  };

  insertOrUpdate = async (lineQueueDatas: LineMessageQueue[]) => {
    return await this.linequeueRepository.upsert(lineQueueDatas, []);
  };

  updateStatusOldQueueTask = async (currentStatus: number, newStatus: number): Promise<void> => {
    // const todayDate = moment(toJapanDateTime(new Date()))
    //   .startOf('day')
    //   .toDate();

    await this.linequeueRepository
      .createQueryBuilder("line_message_queues")
      .update(LineMessageQueue)
      .set({ status: newStatus })
      .where("status = :status", { status: currentStatus })
      // .andWhere('remind_date < :todayDate', { todayDate: todayDate })
      .execute();
  };

  updateStatusOldQueueTaskOfUser = async (userId: number): Promise<void> => {
    await this.linequeueRepository
      .createQueryBuilder("line_message_queues")
      .update(LineMessageQueue)
      .set({ status: LineMessageQueueStatus.NOT_SEND_TIMEOUT })
      .where("status = :status", { status: LineMessageQueueStatus.NOT_SEND })
      .andWhere("user_id = :user_id", { user_id: userId })
      .execute();

    await this.linequeueRepository
      .createQueryBuilder("line_message_queues")
      .update(LineMessageQueue)
      .set({ status: LineMessageQueueStatus.NOT_REPLY_TIMEOUT })
      .where("status = :status", { status: LineMessageQueueStatus.WAITING_REPLY })
      .andWhere("user_id = :user_id", { user_id: userId })
      .execute();
  };

  getTodayQueueTasks = async (user: User = null): Promise<Array<LineMessageQueue>> => {
    const todayDate = moment(toJapanDateTime(new Date()))
      .startOf("day")
      .toDate();

    const query = this.linequeueRepository
      .createQueryBuilder("line_message_queues")
      .innerJoinAndSelect(
        "line_message_queues.todo",
        "todos",
        "line_message_queues.todo_id = todos.id AND todos.reminded_count < :count",
        {
          count: Common.remindMaxCount,
        }
      )
      .innerJoinAndSelect("line_message_queues.user", "users")
      .where("status = :status", { status: LineMessageQueueStatus.NOT_SEND })
      .andWhere("remind_date = :remind_date", { remind_date: todayDate })
      .orderBy({ "line_message_queues.id": "ASC" });

    if (user) {
      query.andWhere("line_message_queues.user_id = :user_id", { user_id: user.id });
    }

    return await query.getMany();
  };
}
