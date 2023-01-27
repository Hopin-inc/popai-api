import Container, { Service } from "typedi";
import { Repository } from "typeorm";
import moment from "moment";

import ChatToolUser from "@/entities/ChatToolUser";
import Company from "@/entities/Company";
import LineMessageQueue from "@/entities/LineMessageQueue";
import Todo from "@/entities/Todo";
import User from "@/entities/User";

import CommonRepository from "./CommonRepository";

import { ChatToolCode, LineMessageQueueStatus, MAX_REMIND_COUNT, RemindType } from "@/consts/common";
import { diffDays, toJapanDateTime } from "@/utils/common";
import AppDataSource from "@/config/data-source";
import { ICompany } from "@/types";

@Service()
export default class LineMessageQueueRepository {
  private lineQueueRepository: Repository<LineMessageQueue>;
  private todoRepository: Repository<Todo>;
  private commonRepository: CommonRepository;

  constructor() {
    this.lineQueueRepository = AppDataSource.getRepository(LineMessageQueue);
    this.todoRepository = AppDataSource.getRepository(Todo);
    this.commonRepository = Container.get(CommonRepository);
  }

  updateStatusOfOldQueueTask = async (): Promise<void> => {
    await this.updateStatusOldQueueTask(
      LineMessageQueueStatus.WAITING,
      LineMessageQueueStatus.TIMEOUT_NOT_SENT
    );

    await this.updateStatusOldQueueTask(
      LineMessageQueueStatus.UNREPLIED,
      LineMessageQueueStatus.TIMEOUT_NO_REPLY
    );
  };

  createTodayQueueTask = async (company: Company, chattoolUsers: ChatToolUser[]): Promise<any> => {
    const companyWithChattools = { ...company, chattools: company.chatTools };
    const todos: Todo[] = await this.getRemindTodoTask(companyWithChattools);
    await this.createLineQueueMessage(companyWithChattools, chattoolUsers, todos);
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
        for (const user of todo.users) {
          company.chattools.forEach(async chattool => {
            if (chattool.tool_code === ChatToolCode.LINE) {
              const chatToolUser = chattoolUsers.find(
                chattoolUser => chattoolUser.chattool_id === chattool.id && chattoolUser.user_id === user.id
              );

              if (chatToolUser) {
                const lineQueueData = new LineMessageQueue();
                lineQueueData.todo_id = todo.id;
                lineQueueData.user_id = user.id;
                lineQueueData.remind_date = moment(today)
                  .startOf("day")
                  .toDate();
                dataLineQueues.push(lineQueueData);
              }
            }
          });
        }
      }
    });

    if (dataLineQueues.length) {
      await this.lineQueueRepository.upsert(dataLineQueues, []);
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
      .andWhere("todos.reminded_count < :reminded_count", { reminded_count: MAX_REMIND_COUNT })
      .andWhere("todos.deadline >= :min_date", { min_date: minDate })
      .andWhere("todos.deadline <= :max_date", { max_date: maxDate })
      .andWhere("todo_users.deleted_at IS NULL");

    if (user) {
      query.andWhere("todo_users.user_id = :user_id", { user_id: user.id });
    }

    return await query.getMany();
  };

  fetchLineMessageQueue = async (userId: number): Promise<LineMessageQueue> => {
    return await this.lineQueueRepository.findOne({
      where: {
        user_id: userId,
        status: LineMessageQueueStatus.UNREPLIED,
        remind_date: moment(toJapanDateTime(new Date()))
          .startOf("day")
          .toDate(),
      },
      relations: ["todo.todoUsers.user.todoAppUsers", "user", "message", "todo.todoapp"],
    });
  };

  getFirstQueueTaskForSendLine = async (userId: number): Promise<LineMessageQueue> => {
    return await this.lineQueueRepository.findOne({
      relations: ["todo", "user"],
      where: {
        user_id: userId,
        status: LineMessageQueueStatus.WAITING,
        remind_date: moment(toJapanDateTime(new Date()))
          .startOf("day")
          .toDate(),
      },
    });
  };

  saveQueue = async (queue: LineMessageQueue) => {
    return await this.lineQueueRepository.save(queue);
  };

  insertOrUpdate = async (lineQueueDatas: LineMessageQueue[]) => {
    return await this.lineQueueRepository.upsert(lineQueueDatas, []);
  };

  updateStatusOldQueueTask = async (currentStatus: number, newStatus: number): Promise<void> => {
    // consts todayDate = moment(toJapanDateTime(new Date()))
    //   .startOf('day')
    //   .toDate();

    await this.lineQueueRepository
      .createQueryBuilder("line_message_queues")
      .update(LineMessageQueue)
      .set({ status: newStatus })
      .where("status = :status", { status: currentStatus })
      // .andWhere('remind_date < :todayDate', { todayDate: todayDate })
      .execute();
  };

  updateStatusOldQueueTaskOfUser = async (userId: number): Promise<void> => {
    await this.lineQueueRepository
      .createQueryBuilder("line_message_queues")
      .update(LineMessageQueue)
      .set({ status: LineMessageQueueStatus.TIMEOUT_NOT_SENT })
      .where("status = :status", { status: LineMessageQueueStatus.WAITING })
      .andWhere("user_id = :user_id", { user_id: userId })
      .execute();

    await this.lineQueueRepository
      .createQueryBuilder("line_message_queues")
      .update(LineMessageQueue)
      .set({ status: LineMessageQueueStatus.TIMEOUT_NO_REPLY })
      .where("status = :status", { status: LineMessageQueueStatus.UNREPLIED })
      .andWhere("user_id = :user_id", { user_id: userId })
      .execute();
  };

  getTodayQueueTasks = async (user: User = null): Promise<Array<LineMessageQueue>> => {
    const todayDate = moment(toJapanDateTime(new Date()))
      .startOf("day")
      .toDate();

    const query = this.lineQueueRepository
      .createQueryBuilder("line_message_queues")
      .innerJoinAndSelect(
        "line_message_queues.todo",
        "todos",
        "line_message_queues.todo_id = todos.id AND todos.reminded_count < :count",
        {
          count: MAX_REMIND_COUNT,
        }
      )
      .innerJoinAndSelect("line_message_queues.user", "users")
      .where("is_reminded = :is_reminded", { is_reminded: RemindType.NOT_REMIND })
      .andWhere("remind_date = :remind_date", { remind_date: todayDate })
      .orderBy({ "line_message_queues.id": "ASC" });

    if (user) {
      query.andWhere("line_message_queues.user_id = :user_id", { user_id: user.id });
    }

    return await query.getMany();
  };
}
