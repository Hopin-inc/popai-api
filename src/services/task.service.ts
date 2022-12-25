import { AppDataSource } from '../config/data-source';
import { InternalServerErrorException, LoggerError } from '../exceptions';
import { Not, Repository, IsNull } from 'typeorm';

import { Company } from '../entify/company.entity';
import MicrosoftRepository from '../repositories/microsoft.repository';
import TrelloRepository from '../repositories/trello.repository';
import { Common, RemindUserJobResult, RemindUserJobStatus } from '../const/common';
import { Service, Container } from 'typedi';
import logger from '../logger/winston';
import RemindRepository from './../repositories/remind.repository';
import SlackRepository from '../repositories/slack.repository';
import LineQueueRepository from './../repositories/modules/lineQueue.repository';
import CommonRepository from './../repositories/modules/common.repository';
import { User } from '../entify/user.entity';
import { ICompany, ITodoAppUser } from '../types';
import { RemindUserJob } from '../entify/remind_user_job.entity';
import { toJapanDateTime } from '../utils/common';
import { Todo } from '../entify/todo.entity';

@Service()
export default class TaskService {
  private trelloRepo: TrelloRepository;
  private microsoftRepo: MicrosoftRepository;
  private companyRepository: Repository<Company>;
  private remindRepository: RemindRepository;
  private lineQueueRepository: LineQueueRepository;
  private commonRepository: CommonRepository;
  private slackRepository: SlackRepository;
  private remindUserJobRepository: Repository<RemindUserJob>;

  constructor() {
    this.trelloRepo = Container.get(TrelloRepository);
    this.microsoftRepo = Container.get(MicrosoftRepository);
    this.companyRepository = AppDataSource.getRepository(Company);
    this.remindRepository = Container.get(RemindRepository);
    this.lineQueueRepository = Container.get(LineQueueRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.slackRepository = Container.get(SlackRepository);
    this.remindUserJobRepository = AppDataSource.getRepository(RemindUserJob);
  }

  /**
   * Update todo task
   */
  syncTodoTasks = async (company: ICompany = null): Promise<any> => {
    try {
      // update old line queue
      await this.lineQueueRepository.updateStatusOfOldQueueTask();

      let whereCondition = {
        todoapps: { id: Not(IsNull()) },
      };

      if (company) {
        whereCondition = {
          todoapps: { id: Not(IsNull()) },
          ...{ id: company.id },
        };
      }

      const companies = await this.companyRepository.find({
        relations: [
          'todoapps',
          'chattools',
          'admin_user',
          'companyConditions',
          'users.todoAppUsers',
        ],
        where: whereCondition,
      });

      for (const company of companies) {
        for (const todoapp of company.todoapps) {
          switch (todoapp.todo_app_code) {
            case Common.trello:
              await this.trelloRepo.syncTaskByUserBoards(company, todoapp);
              break;
            case Common.microsoft:
              await this.microsoftRepo.syncTaskByUserBoards(company, todoapp);
              break;
            default:
              break;
          }
        }
      }

      return;
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  };

  /**
   * Remind todo task
   */
  remindTaskForCompany = async (): Promise<any> => {
    try {
      // update old line queue
      await this.lineQueueRepository.updateStatusOfOldQueueTask();
      const chattoolUsers = await this.commonRepository.getChatToolUsers();

      const lineUsers = chattoolUsers.filter(user => user.chattool_id === 1);
      const companies = await this.companyRepository.find({
        relations: ['chattools', 'admin_user', 'companyConditions'],
      });

      for (const company of companies) {
        await this.lineQueueRepository.createTodayQueueTask(company, lineUsers);
        await this.remindRepository.remindTaskForAdminCompany(company);
      }
      await this.remindRepository.remindTodayTaskForUser();

      for (const company of companies) {
        if (company.id === 2) {
          await this.slackRepository.remindTaskForAdminCompany(company);
          await this.slackRepository.remindTodayTaskForUser(company);
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  };

  /**
   * Remind todo task
   */
  remindTaskForDemoUser = async (user: User): Promise<number> => {
    try {
      console.log('remindTaskForDemoUser - START');

      const processingJobs = await this.remindUserJobRepository.findBy({
        user_id: user.id,
        status: RemindUserJobStatus.PROCESSING,
      });

      if (processingJobs.length) {
        return RemindUserJobResult.FAILED_HAS_PROCESSING_JOB;
      }

      // save job
      const job = new RemindUserJob();
      job.user_id = user.id;
      job.created_at = toJapanDateTime(new Date());
      job.status = RemindUserJobStatus.PROCESSING;
      await this.remindUserJobRepository.save(job);

      const userCompany = await this.companyRepository.findOne({
        relations: ['todoapps', 'chattools', 'admin_user', 'companyConditions'],
        where: {
          todoapps: { id: Not(IsNull()) },
          ...{ id: user.company_id, is_demo: true },
        },
      });

      if (!userCompany) {
        return;
      }

      // sync task for company of the user
      await this.syncTodoTasks(userCompany);

      // update old line queue
      await this.lineQueueRepository.updateStatusOldQueueTaskOfUser(user.id);
      const chattoolUsers = await this.commonRepository.getChatToolUsers();

      // create queue for user
      await this.lineQueueRepository.createTodayQueueTaskForUser(chattoolUsers, user, userCompany);

      //remind task for user by queue
      await this.remindRepository.remindTodayTaskForUser(user);

      // update job status
      const processingJob = await this.remindUserJobRepository.findOneBy({
        user_id: user.id,
        status: RemindUserJobStatus.PROCESSING,
      });

      if (processingJob) {
        processingJob.status = RemindUserJobStatus.DONE;
        processingJob.updated_at = toJapanDateTime(new Date());
        await this.remindUserJobRepository.save(processingJob);
      }

      console.log('remindTaskForDemoUser - END');

      return RemindUserJobResult.OK;
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  };

  updateTask = async (todoappRegId: string, task: Todo, todoAppUser: ITodoAppUser, correctDelayedCount: boolean = false) => {
    switch (task.todoapp.todo_app_code) {
      case Common.trello:
        await this.trelloRepo.updateTodo(todoappRegId, task, todoAppUser, correctDelayedCount);
        return;
      case Common.microsoft:
        await this.microsoftRepo.updateTodo(todoappRegId, task, todoAppUser, correctDelayedCount);
        return;
    }
  };
}
