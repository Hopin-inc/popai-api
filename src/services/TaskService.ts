import { FindOptionsWhere } from "typeorm";
import { Service, Container } from "typedi";

import Company from "@/entities/settings/Company";
import RemindUserJob from "@/entities/transactions/RemindUserJob";
import Todo from "@/entities/transactions/Todo";
import User from "@/entities/settings/User";
import TodoAppUser from "@/entities/settings/TodoAppUser";

import MicrosoftRepository from "@/repositories/MicrosoftRepository";
import TrelloRepository from "@/repositories/TrelloRepository";
import RemindRepository from "@/repositories/RemindRepository";
import SlackRepository from "@/repositories/SlackRepository";
import NotionRepository from "@/repositories/NotionRepository";

import { ChatToolUserRepository } from "@/repositories/settings/ChatToolUserRepository";

import {
  ChatToolId,
  RemindUserJobResult,
  RemindUserJobStatus,
  TodoAppId,
} from "@/consts/common";
import logger from "@/logger/winston";
import LineRepository from "@/repositories/LineRepository";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import { RemindUserJobRepository } from "@/repositories/transactions/RemindUserJobRepository";
import { LineMessageQueueRepository } from "@/repositories/transactions/LineMessageQueueRepository";
import NotionService from "@/services/NotionService";

@Service()
export default class TaskService {
  private trelloRepository: TrelloRepository;
  private microsoftRepository: MicrosoftRepository;
  private notionRepository: NotionRepository;
  private remindRepository: RemindRepository;
  private slackRepository: SlackRepository;
  private lineRepository: LineRepository;

  constructor() {
    this.trelloRepository = Container.get(TrelloRepository);
    this.microsoftRepository = Container.get(MicrosoftRepository);
    this.notionRepository = Container.get(NotionRepository);
    this.remindRepository = Container.get(RemindRepository);
    this.slackRepository = Container.get(SlackRepository);
    this.lineRepository = Container.get(LineRepository);
  }

  /**
   * Update todos
   */
  public async syncTodos(company: Company = null, notify: boolean = false): Promise<any> {
    try {
      // update old line queue
      await LineMessageQueueRepository.updateStatusOfOldQueueTask();
      const where: FindOptionsWhere<Company> = company ? { id: company.id } : {};
      const companies = await CompanyRepository.find({
        relations: [
          "sections",
          "implementedTodoApps.todoApp",
          "implementedChatTools.chattool",
          "adminUser",
          "companyConditions",
          "users.todoAppUsers",
          "notifyConfig",
        ],
        where,
      });
      await Promise.all(companies.map(async company => {
        const enabled = notify && (company.notifyConfig?.enabled ?? false);
        for (const todoApp of company.todoApps) {
          const logMeta = {
            company: company.name,
            todoApp: todoApp.name,
            notify: enabled,
          };
          logger.info(`Start: syncTodos { company: ${ company.id }, section: ALL }`, logMeta);
          try {
            switch (todoApp.id) {
              case TodoAppId.TRELLO:  // TODO: Get credentials from db.
                await this.trelloRepository.syncTaskByUserBoards(company, todoApp, enabled);
                break;
              case TodoAppId.MICROSOFT: // TODO: Enable notify option.
                await this.microsoftRepository.syncTaskByUserBoards(company, todoApp);
                break;
              case TodoAppId.NOTION:
                const notionClient = await NotionService.init(company.id);
                if (notionClient) {
                  await this.notionRepository.syncTaskByUserBoards(company, todoApp, notionClient, enabled);
                }
                break;
              default:
                break;
            }
            logger.info(`Start: syncTodos { company: ${ company.id }, section: ALL }`, logMeta);
          } catch (error) {
            logger.error(error);
          }
        }
      }));
      return;
    } catch (error) {
      logger.error(error);
    }
  }

  /**
   * Remind todos
   */
  public async remind(): Promise<any> {
    try {
      // update old line queue
      await LineMessageQueueRepository.updateStatusOfOldQueueTask();
      const chattoolUsers = await ChatToolUserRepository.find();
      const companies = await CompanyRepository.find({
        relations: ["implementedChatTools.chattool", "adminUser.chattoolUsers.chattool", "companyConditions"],
      });

      const remindOperations = async (company: Company) => {
        for (const chatTool of company.chatTools) {
          try {
            switch (chatTool.id) {
              case ChatToolId.LINE:
                await LineMessageQueueRepository.createTodayQueueTask(company, chattoolUsers);
                await this.remindRepository.remindTaskForAdminCompany(company);
                break;
              case ChatToolId.SLACK:
                await this.slackRepository.remindTaskForAdminCompany(company);
                await this.slackRepository.remindTodayTaskForUser(company);
                break;
            }
          } catch (error) {
            logger.error(error);
          }
        }
      };
      await Promise.all(companies.map(company => remindOperations(company)));
      await this.remindRepository.remindTodayTaskForUser();
    } catch (error) {
      logger.error(error);
    }
  }

  /**
   * Remind todos
   */
  public async remindForDemoUser(user: User): Promise<number> {
    try {
      const processingJobs = await RemindUserJobRepository.findBy({
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
      await RemindUserJobRepository.save(job);

      const userCompany = await CompanyRepository.findOne({
        relations: ["implementedTodoApps.todoapp", "implementedChatTools.chattool", "adminUser", "companyConditions"],
        where: { id: user.company_id, is_demo: true },
      });

      if (!userCompany) {
        return;
      }

      // sync task for company of the user
      await this.syncTodos(userCompany);

      // update old line queue
      await LineMessageQueueRepository.updateStatusOldQueueTaskOfUser(user.id);
      const chattoolUsers = await ChatToolUserRepository.find();

      // create queue for user
      await LineMessageQueueRepository.createTodayQueueTaskForUser(chattoolUsers, user, userCompany);

      //remind task for user by queue
      await this.remindRepository.remindTodayTaskForUser(user);

      // update job status
      const processingJob = await RemindUserJobRepository.findOneBy({
        user_id: user.id,
        status: RemindUserJobStatus.PROCESSING,
      });

      if (processingJob) {
        processingJob.status = RemindUserJobStatus.DONE;
        await RemindUserJobRepository.save(processingJob);
      }

      return RemindUserJobResult.OK;
    } catch (error) {
      logger.error(error);
    }
  }

  public async update(
    todoappRegId: string,
    todo: Todo,
    todoAppUser: TodoAppUser,
    correctDelayedCount: boolean = false,
  ) {
    switch (todo.todoapp.id) {
      case TodoAppId.TRELLO:
        await this.trelloRepository.updateTodo(todoappRegId, todo, todoAppUser, correctDelayedCount);
        return;
      case TodoAppId.MICROSOFT:
        await this.microsoftRepository.updateTodo(todoappRegId, todo, todoAppUser, correctDelayedCount);
        return;
      case TodoAppId.NOTION:
        const notionClient = await NotionService.init(todo.company_id);
        if (notionClient) {
          await this.notionRepository.updateTodo(todoappRegId, todo, todoAppUser, notionClient, correctDelayedCount);
        }
        return;
    }
  }
}
