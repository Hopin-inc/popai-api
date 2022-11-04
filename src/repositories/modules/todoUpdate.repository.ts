import { ITodo } from '../../types';
import { Service } from 'typedi';
import { Repository } from 'typeorm';
import moment from 'moment';
import { AppDataSource } from '../../config/data-source';
import logger from '../../logger/winston';
import { LoggerError } from '../../exceptions';
import { TodoUpdateHistory } from '../../entify/todoupdatehistory.entity';

@Service()
export default class TodoUpdateRepository {
  private todoUpdateRepository: Repository<TodoUpdateHistory>;

  constructor() {
    this.todoUpdateRepository = AppDataSource.getRepository(TodoUpdateHistory);
  }

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
