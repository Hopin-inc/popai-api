import { Repository, FindOptionsWhere } from "typeorm";
import { Service, Container } from "typedi";

import Company from "@/entities/Company";
import RemindUserJob from "@/entities/RemindUserJob";
import Todo from "@/entities/Todo";
import User from "@/entities/User";

import MicrosoftRepository from "@/repositories/MicrosoftRepository";
import TrelloRepository from "@/repositories/TrelloRepository";
import RemindRepository from "@/repositories/RemindRepository";
import LineMessageQueueRepository from "@/repositories/modules/LineMessageQueueRepository";
import SlackRepository from "@/repositories/SlackRepository";
import CommonRepository from "@/repositories/modules/CommonRepository";
import NotionRepository from "@/repositories/NotionRepository";

import { ChatToolCode, RemindUserJobResult, RemindUserJobStatus, TodoAppCode } from "@/consts/common";
import logger from "@/logger/winston";
import { ICompany, ITodoAppUser } from "@/types";
import AppDataSource from "@/config/data-source";
import { InternalServerErrorException, LoggerError } from "@/exceptions";

@Service()
export default class TaskService {
  private trelloRepo: TrelloRepository;
  private microsoftRepo: MicrosoftRepository;
  private notionRepo: NotionRepository;
  private companyRepository: Repository<Company>;
  private remindRepository: RemindRepository;
  private lineQueueRepository: LineMessageQueueRepository;
  private commonRepository: CommonRepository;
  private slackRepository: SlackRepository;
  private remindUserJobRepository: Repository<RemindUserJob>;

  constructor() {
    this.trelloRepo = Container.get(TrelloRepository);
    this.microsoftRepo = Container.get(MicrosoftRepository);
    this.notionRepo = Container.get(NotionRepository);
    this.companyRepository = AppDataSource.getRepository(Company);
    this.remindRepository = Container.get(RemindRepository);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
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
        relations: ["implementedTodoApps.todoApp", "implementedChatTools.chattool", "adminUser", "companyConditions", "users.todoAppUsers"],
        where,
      });

      for (const company of companies) {
        for (const todoapp of company.todoApps) {
          const companyWithChatTools = { ...company, chattools: company.chatTools };
          switch (todoapp.todo_app_code) {
            case TodoAppCode.TRELLO:
              await this.trelloRepo.syncTaskByUserBoards(companyWithChatTools, todoapp);
              break;
            case TodoAppCode.MICROSOFT:
              await this.microsoftRepo.syncTaskByUserBoards(companyWithChatTools, todoapp);
              break;
            case TodoAppCode.NOTION:
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
        relations: ["implementedChatTools.chattool", "adminUser", "companyConditions"],
      });

      const remindOperations = async (company: Company) => {
        for (const chatTool of company.chatTools) {
          switch (chatTool.tool_code) {
            case ChatToolCode.LINE:
              await this.lineQueueRepository.createTodayQueueTask(company, chattoolUsers);
              await this.remindRepository.remindTaskForAdminCompany({ ...company, chattools: company.chatTools });
              break;
            case ChatToolCode.SLACK:
              await this.slackRepository.remindTaskForAdminCompany(company);
              await this.slackRepository.remindTodayTaskForUser(company);
              break;
          }
        }
      };
      await Promise.all(companies.map(company => remindOperations(company)));
      await this.remindRepository.remindTodayTaskForUser();
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
      console.log("remindTaskForDemoUser - START");

      const processingJobs = await this.remindUserJobRepository.findBy({
        user_id: user.id,
        status: RemindUserJobStatus.PROCESSING,
      });

      if (processingJobs.length) {
        return RemindUserJobResult.FAILED_WITH_PROCESSING_JOB;
      }

      // save job
      const job = new RemindUserJob();
      job.user_id = user.id;
      job.status = RemindUserJobStatus.PROCESSING;
      await this.remindUserJobRepository.save(job);

      const userCompany = await this.companyRepository.findOne({
        relations: ["implementedTodoApps.todoapp", "implementedChatTools.chattool", "adminUser", "companyConditions"],
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
        await this.remindUserJobRepository.save(processingJob);
      }

      console.log("remindTaskForDemoUser - END");

      return RemindUserJobResult.OK;
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  };

  updateTask = async (todoappRegId: string, task: Todo, todoAppUser: ITodoAppUser, correctDelayedCount: boolean = false) => {
    switch (task.todoapp.todo_app_code) {
      case TodoAppCode.TRELLO:
        await this.trelloRepo.updateTodo(todoappRegId, task, todoAppUser, correctDelayedCount);
        return;
      case TodoAppCode.MICROSOFT:
        await this.microsoftRepo.updateTodo(todoappRegId, task, todoAppUser, correctDelayedCount);
        return;
      case TodoAppCode.NOTION:
        await this.notionRepo.updateTodo(todoappRegId, task, todoAppUser, correctDelayedCount);
        return;
    }
  };
}
