import { Repository, FindOptionsWhere } from "typeorm";
import { Service, Container } from "typedi";

import Company from "@/entities/Company";
import RemindUserJob from "@/entities/RemindUserJob";
import Todo from "@/entities/Todo";
import User from "@/entities/User";
import TodoAppUser from "@/entities/TodoAppUser";

import MicrosoftRepository from "@/repositories/MicrosoftRepository";
import TrelloRepository from "@/repositories/TrelloRepository";
import RemindRepository from "@/repositories/RemindRepository";
import LineMessageQueueRepository from "@/repositories/modules/LineMessageQueueRepository";
import SlackRepository from "@/repositories/SlackRepository";
import CommonRepository from "@/repositories/modules/CommonRepository";
import NotionRepository from "@/repositories/NotionRepository";

import { ChatToolCode, RemindUserJobResult, RemindUserJobStatus, TodoAppCode } from "@/consts/common";
import logger from "@/logger/winston";
import AppDataSource from "@/config/data-source";
import { InternalServerErrorException, LoggerError } from "@/exceptions";
import TodoApp from "@/entities/TodoApp";

@Service()
export default class TaskService {
  private trelloRepository: TrelloRepository;
  private microsoftRepository: MicrosoftRepository;
  private notionRepository: NotionRepository;
  private companyRepository: Repository<Company>;
  private remindRepository: RemindRepository;
  private lineQueueRepository: LineMessageQueueRepository;
  private commonRepository: CommonRepository;
  private slackRepository: SlackRepository;
  private remindUserJobRepository: Repository<RemindUserJob>;

  constructor() {
    this.trelloRepository = Container.get(TrelloRepository);
    this.microsoftRepository = Container.get(MicrosoftRepository);
    this.notionRepository = Container.get(NotionRepository);
    this.companyRepository = AppDataSource.getRepository(Company);
    this.remindRepository = Container.get(RemindRepository);
    this.lineQueueRepository = Container.get(LineMessageQueueRepository);
    this.commonRepository = Container.get(CommonRepository);
    this.slackRepository = Container.get(SlackRepository);
    this.remindUserJobRepository = AppDataSource.getRepository(RemindUserJob);
  }

  /**
   * Update todos
   */
  public async syncTodos(company: Company = null): Promise<any> {
    try {
      // update old line queue
      await this.lineQueueRepository.updateStatusOfOldQueueTask();

      const where: FindOptionsWhere<Company> = company ? { id: company.id } : {};

      const companies = await this.companyRepository.find({
        relations: [
          "implementedTodoApps.todoApp",
          "implementedChatTools.chattool",
          "adminUser",
          "companyConditions",
          "users.todoAppUsers"
        ],
        where,
      });

      const syncOperations = (company: Company, todoApp: TodoApp) => {
        switch (todoApp.todo_app_code) {
          case TodoAppCode.TRELLO:
            return this.trelloRepository.syncTaskByUserBoards(company, todoApp);
          case TodoAppCode.MICROSOFT:
            return this.microsoftRepository.syncTaskByUserBoards(company, todoApp);
          case TodoAppCode.NOTION:
            return this.notionRepository.syncTaskByUserBoards(company, todoApp);
          default:
            return;
        }
      };
      const companyTodoApps: [Company, TodoApp][] = [];
      companies.forEach(company => {
        company.todoApps.forEach(todoApp => companyTodoApps.push([company, todoApp]));
      });
      await Promise.all(companyTodoApps.map(([company, todoApp]) => syncOperations(company, todoApp)));
      return;
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Remind todos
   */
  public async remind(): Promise<any> {
    try {
      // update old line queue
      await this.lineQueueRepository.updateStatusOfOldQueueTask();
      const chattoolUsers = await this.commonRepository.getChatToolUsers();
      const companies = await this.companyRepository.find({
        relations: ["implementedChatTools.chattool", "adminUser.chattoolUsers.chattool", "companyConditions"],
      });

      const remindOperations = async (company: Company) => {
        for (const chatTool of company.chatTools) {
          switch (chatTool.tool_code) {
            case ChatToolCode.LINE:
              await this.lineQueueRepository.createTodayQueueTask(company, chattoolUsers);
              await this.remindRepository.remindTaskForAdminCompany(company);
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
  }

  /**
   * Remind todos
   */
  public async remindForDemoUser(user: User): Promise<number> {
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
      await this.syncTodos(userCompany);

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
        await this.remindUserJobRepository.save(processingJob);
      }

      console.log("remindTaskForDemoUser - END");

      return RemindUserJobResult.OK;
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  }

  public async update(
    todoappRegId: string,
    todo: Todo,
    todoAppUser: TodoAppUser,
    correctDelayedCount: boolean = false
  ) {
    switch (todo.todoapp.todo_app_code) {
      case TodoAppCode.TRELLO:
        await this.trelloRepository.updateTodo(todoappRegId, todo, todoAppUser, correctDelayedCount);
        return;
      case TodoAppCode.MICROSOFT:
        await this.microsoftRepository.updateTodo(todoappRegId, todo, todoAppUser, correctDelayedCount);
        return;
      case TodoAppCode.NOTION:
        await this.notionRepository.updateTodo(todoappRegId, todo, todoAppUser, correctDelayedCount);
        return;
    }
  }
}
