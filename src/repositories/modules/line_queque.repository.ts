import { Service } from 'typedi';
import { Repository, SelectQueryBuilder } from 'typeorm';
import moment from 'moment';
import { AppDataSource } from '../../config/data-source';
import { LineMessageQueue } from '../../entify/line_message_queue.entity';
import { Common, LineMessageQueueStatus } from '../../const/common';
import { toJapanDateTime } from '../../utils/common';
import { Todo } from './../../entify/todo.entity';
import { ITodoQueue } from './../../types';

@Service()
export default class LineQuequeRepository {
  private linequeueRepository: Repository<LineMessageQueue>;
  private todoRepository: Repository<Todo>;

  constructor() {
    this.linequeueRepository = AppDataSource.getRepository(LineMessageQueue);
    this.todoRepository = AppDataSource.getRepository(Todo);
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

  getWaitingQueueTask = async (userId: number): Promise<LineMessageQueue> => {
    return await this.linequeueRepository.findOne({
      where: {
        user_id: userId,
        status: LineMessageQueueStatus.WAITING_REPLY,
        remind_date: moment(toJapanDateTime(new Date()))
          .startOf('day')
          .toDate(),
      },
      relations: ['todo', 'user', 'message'],
    });
  };

  getFirstQueueTaskForSendLine = async (userId: number): Promise<LineMessageQueue> => {
    return await this.linequeueRepository.findOne({
      relations: ['todo', 'user'],
      where: {
        user_id: userId,
        status: LineMessageQueueStatus.NOT_SEND,
        remind_date: moment(toJapanDateTime(new Date()))
          .startOf('day')
          .toDate(),
      },
    });
  };

  saveQueue = async (queque: LineMessageQueue) => {
    return await this.linequeueRepository.save(queque);
  };

  insertOrUpdate = async (lineQueueDatas: LineMessageQueue[]) => {
    return await this.linequeueRepository.upsert(lineQueueDatas, []);
  };

  updateStatusOldQueueTask = async (currentStatus: number, newStatus: number): Promise<void> => {
    // const todayDate = moment(toJapanDateTime(new Date()))
    //   .startOf('day')
    //   .toDate();

    await this.linequeueRepository
      .createQueryBuilder('line_message_queues')
      .update(LineMessageQueue)
      .set({ status: newStatus })
      .where('status =:status', { status: currentStatus })
      // .andWhere('remind_date < :todayDate', { todayDate: todayDate })
      .execute();
  };

  getTodayQueueTasks = async (): Promise<Array<LineMessageQueue>> => {
    const todayDate = moment(toJapanDateTime(new Date()))
      .startOf('day')
      .toDate();

    const lineQueues = await this.linequeueRepository
      .createQueryBuilder('line_message_queues')
      .innerJoinAndSelect(
        'line_message_queues.todo',
        'todos',
        'line_message_queues.todo_id = todos.id AND todos.reminded_count < :count',
        {
          count: Common.remindMaxCount,
        }
      )
      .innerJoinAndSelect('line_message_queues.user', 'users')
      .where('status =:status', { status: LineMessageQueueStatus.NOT_SEND })
      .andWhere('remind_date =:remind_date', { remind_date: todayDate })
      .orderBy({ 'line_message_queues.id': 'ASC' })
      .getMany();

    return lineQueues;
  };

  pushTodoLineQueues = async (dataTodoLineQueues: ITodoQueue[]): Promise<void> => {
    const dataLineQueues: LineMessageQueue[] = [];
    for (const todoLineQueue of dataTodoLineQueues) {
      const { todoId, user } = todoLineQueue;

      const todo = await this.todoRepository.findOneBy({
        todoapp_reg_id: todoId,
      });

      if (todo) {
        const todayDate = moment(toJapanDateTime(new Date()))
          .startOf('day')
          .toDate();

        // const todoLineQueue: LineMessageQueue = await this.linequeueRepository.findOneBy({
        //   todo_id: todo.id,
        //   user_id: user.id,
        //   remind_date: todayDate,
        // });

        const lineQueueData = new LineMessageQueue();
        // lineQueueData.id = todoLineQueue?.id || null;
        lineQueueData.todo_id = todo.id;
        lineQueueData.user_id = user.id;
        lineQueueData.remind_date = todayDate;
        dataLineQueues.push(lineQueueData);
      }
    }

    if (dataLineQueues.length) {
      await this.linequeueRepository.upsert(dataLineQueues, []);
    }
  };
}
