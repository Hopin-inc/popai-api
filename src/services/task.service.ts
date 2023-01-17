import { AppDataSource } from '../config/data-source';
import { InternalServerErrorException, LoggerError } from '../exceptions';
import { Repository, FindOptionsWhere } from "typeorm";
import { Company } from '../entify/company.entity';
import MicrosoftRepository from '../repositories/microsoft.repository';
import TrelloRepository from '../repositories/trello.repository';
import { Common, RemindUserJobResult, RemindUserJobStatus } from '../const/common';
import { Service, Container } from 'typedi';
import logger from '../logger/winston';
import RemindRepository from '../repositories/remind.repository';
import LineQueueRepository from '../repositories/modules/lineQueue.repository';
import SlackRepository from "../repositories/slack.repository";
import CommonRepository from '../repositories/modules/common.repository';
import NotionRepository from '../repositories/notion.repository';
import { User } from '../entify/user.entity';
import { ICompany, ITodoAppUser } from '../types';
import { RemindUserJob } from '../entify/remind_user_job.entity';
import { toJapanDateTime } from '../utils/common';
import { Todo } from '../entify/todo.entity';

@Service()
export default class TaskService {
  private trelloRepo: TrelloRepository;
  private microsoftRepo: MicrosoftRepository;
  private notionRepo: NotionRepository;
  private companyRepository: Repository<Company>;
  private remindRepository: RemindRepository;
  private lineQueueRepository: LineQueueRepository;
  private commonRepository: CommonRepository;
  private slackRepository: SlackRepository;
  private remindUserJobRepository: Repository<RemindUserJob>;

  constructor() {
    this.trelloRepo = Container.get(TrelloRepository);
    this.microsoftRepo = Container.get(MicrosoftRepository);
    this.notionRepo = Container.get(NotionRepository);
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

      const where: FindOptionsWhere<Company> = company ? { id: company.id } : {};

      const companies = await this.companyRepository.find({
        relations: ['implementedTodoApps.todoApp', 'implementedChatTools.chattool', 'adminUser', 'companyConditions', 'users.todoAppUsers'],
        where,
      });

      for (const company of companies) {
        for (const todoapp of company.todoApps) {
          const companyWithChatTools = { ...company, chattools: company.chatTools }
          switch (todoapp.todo_app_code) {
            case Common.trello:
              await this.trelloRepo.syncTaskByUserBoards(companyWithChatTools, todoapp);
              break;
            case Common.microsoft:
              await this.microsoftRepo.syncTaskByUserBoards(companyWithChatTools, todoapp);
              break;
            case Common.notion:
              await this.notionRepo.syncTaskByUserBoards(companyWithChatTools, todoapp);
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
      const companies = await this.companyRepository.find({
        relations: ['implementedChatTools.chattool', 'adminUser', 'companyConditions'],
      });

      for (const company of companies) {
        await this.lineQueueRepository.createTodayQueueTask(company, chattoolUsers);
        await this.remindRepository.remindTaskForAdminCompany({ ...company, chattools: company.chatTools });
      }
      await this.remindRepository.remindTodayTaskForUser();

      for (const company of companies) {  // TODO: なぜかcompany_id=2のみの個別処理があるので、排除する。
        if (company.id === 2) {
          // await this.slackRepository.remindTaskForAdminCompany(company); // TODO: companyの型が違うので、修正する。
          // await this.slackRepository.remindTodayTaskForUser(company);  // TODO: companyの型が違うので、修正する。
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
        relations: ['implementedTodoApps.todoapp', 'implementedChatTools.chattool', 'adminUser', 'companyConditions'],
        where: { id: user.company_id, is_demo: true },
      });

      if (!userCompany) {
        return;
      }

      // sync task for company of the user
      const companyWithChatTools = { ...userCompany, chattools: userCompany.chatTools };
      await this.syncTodoTasks(companyWithChatTools);

      // update old line queue
      await this.lineQueueRepository.updateStatusOldQueueTaskOfUser(user.id);
      const chattoolUsers = await this.commonRepository.getChatToolUsers();

      // create queue for user
      await this.lineQueueRepository.createTodayQueueTaskForUser(chattoolUsers, user, companyWithChatTools);

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
