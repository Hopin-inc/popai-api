import Container, { Service } from "typedi";
import { Repository } from "typeorm";
import moment from "moment";

import ChatToolUser from "@/entities/settings/ChatToolUser";
import Company from "@/entities/settings/Company";
import LineMessageQueue from "@/entities/transactions/LineMessageQueue";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";


import { ChatToolCode, LineMessageQueueStatus, MAX_REMIND_COUNT, RemindType } from "@/consts/common";
import { diffDays, toJapanDateTime } from "@/utils/common";
import AppDataSource from "@/config/data-source";
import { TodoRepository } from "@/repositories/TodoRepository";
import { CompanyConditionRepository } from "@/repositories/CompanyConditionRepository";

@Service()
export default class LineMessageQueueRepository {
  private lineQueueRepository: Repository<LineMessageQueue>;

  constructor() {
    this.lineQueueRepository = AppDataSource.getRepository(LineMessageQueue);
  }

  public async updateStatusOfOldQueueTask(): Promise<void> {
    await this.updateStatusOldQueueTask(
      LineMessageQueueStatus.WAITING,
      LineMessageQueueStatus.TIMEOUT_NOT_SENT,
    );

    await this.updateStatusOldQueueTask(
      LineMessageQueueStatus.UNREPLIED,
      LineMessageQueueStatus.TIMEOUT_NO_REPLY,
    );
  }

  public async createTodayQueueTask(company: Company, chattoolUsers: ChatToolUser[]): Promise<any> {
    const todos: Todo[] = await this.getTodosToRemind(company);
    await this.createLineQueueMessage(company, chattoolUsers, todos);
  }

  public async createTodayQueueTaskForUser(
    chattoolUsers: ChatToolUser[],
    user: User,
    company: Company,
  ): Promise<any> {
    const todos: Todo[] = await this.getTodosToRemind(company, user);
    await this.createLineQueueMessage(company, chattoolUsers, todos);
  }

  private async createLineQueueMessage(
    company: Company,
    chattoolUsers: ChatToolUser[],
    todos: Todo[],
  ): Promise<void> {
    const dayReminds: number[] = await CompanyConditionRepository.getDayReminds(
      company.companyConditions,
    );
    const today = toJapanDateTime(new Date());

    const dataLineQueues: LineMessageQueue[] = [];

    todos.forEach((todo) => {
      const dayDurations = diffDays(toJapanDateTime(todo.deadline), today);

      if (dayReminds.includes(dayDurations)) {
        for (const user of todo.users) {
          company.chatTools.forEach(async chatTool => {
            if (chatTool.tool_code === ChatToolCode.LINE) {
              const chatToolUser = chattoolUsers.find(
                chattoolUser => chattoolUser.chattool_id === chatTool.id && chattoolUser.user_id === user.id,
              );

              if (chatToolUser) {
                const lineQueueData = new LineMessageQueue();
                lineQueueData.todo_id = todo.id;
                lineQueueData.user_id = user.id;
                lineQueueData.remind_date = moment(today).startOf("day").toDate();
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
  }

  private async getTodosToRemind(company: Company, user?: User): Promise<Todo[]> {
    const today = toJapanDateTime(new Date());
    const dayReminds: number[] = await CompanyConditionRepository.getDayReminds(company.companyConditions);

    const minValue = dayReminds.reduce(function(prev, curr) {
      return prev < curr ? prev : curr;
    });
    const maxValue = dayReminds.reduce(function(prev, curr) {
      return prev > curr ? prev : curr;
    });

    const minDate = moment(today).add(-maxValue, "days").startOf("day").toDate();
    const maxDate = moment(today).add(-minValue + 1, "days").startOf("day").toDate();

    return await TodoRepository.getRemindTodos(company, minDate, maxDate, user);
  }

  public async fetchLineMessageQueue(userId: number): Promise<LineMessageQueue> {
    return await this.lineQueueRepository.findOne({
      where: {
        user_id: userId,
        status: LineMessageQueueStatus.UNREPLIED,
        remind_date: moment(toJapanDateTime(new Date())).startOf("day").toDate(),
      },
      relations: ["todo.todoUsers.user.todoAppUsers", "user", "message", "todo.todoapp"],
    });
  }

  public async getFirstQueueTaskForSendLine(userId: number): Promise<LineMessageQueue> {
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
  }

  public async saveQueue(queue: LineMessageQueue) {
    return await this.lineQueueRepository.save(queue);
  }

  public async insertOrUpdate(lineQueueDatas: LineMessageQueue[]) {
    return await this.lineQueueRepository.upsert(lineQueueDatas, []);
  }

  public async updateStatusOldQueueTask(currentStatus: number, newStatus: number): Promise<void> {
    // const todayDate = moment(toJapanDateTime(new Date())).startOf('day').toDate();

    await this.lineQueueRepository
      .createQueryBuilder("line_message_queues")
      .update(LineMessageQueue)
      .set({ status: newStatus })
      .where("status = :status", { status: currentStatus })
      // .andWhere('remind_date < :todayDate', { todayDate: todayDate })
      .execute();
  }

  public async updateStatusOldQueueTaskOfUser(userId: number): Promise<void> {
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
  }

  public async getTodayQueueTasks(user: User = null): Promise<Array<LineMessageQueue>> {
    const todayDate = moment(toJapanDateTime(new Date())).startOf("day").toDate();

    let query = this.lineQueueRepository
      .createQueryBuilder("line_message_queues")
      .innerJoinAndSelect(
        "line_message_queues.todo",
        "todos",
        "line_message_queues.todo_id = todos.id AND todos.reminded_count < :count",
        { count: MAX_REMIND_COUNT },
      )
      .innerJoinAndSelect("line_message_queues.user", "users")
      .where("is_reminded = :is_reminded", { is_reminded: RemindType.NOT_REMIND })
      .andWhere("remind_date = :remind_date", { remind_date: todayDate })
      .orderBy({ "line_message_queues.id": "ASC" });

    if (user) {
      query = query.andWhere("line_message_queues.user_id = :user_id", { user_id: user.id });
    }

    return await query.getMany();
  }
}
