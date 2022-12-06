import { AppDataSource } from '../config/data-source';
import { InternalServerErrorException, LoggerError } from '../exceptions';
import { Not, Repository, IsNull } from 'typeorm';

import { Company } from '../entify/company.entity';
import MicrosoftRepository from '../repositories/microsoft.repository';
import TrelloRepository from '../repositories/trello.repository';
import { Common } from '../const/common';
import { Service, Container } from 'typedi';
import logger from '../logger/winston';
import RemindRepository from './../repositories/remind.repository';
import LineQuequeRepository from './../repositories/modules/line_queque.repository';
import CommonRepository from './../repositories/modules/common.repository';
import NotionRepository from '../repositories/notion.repository';
import { IColumnName } from '../types';

@Service()
export default class TaskService {
  private trelloRepo: TrelloRepository;
  private microsofRepo: MicrosoftRepository;
  private notionRepo: NotionRepository;
  private companyRepository: Repository<Company>;
  private remindRepository: RemindRepository;
  private lineQueueRepository: LineQuequeRepository;
  private commonRepository: CommonRepository;

  constructor() {
    this.trelloRepo = Container.get(TrelloRepository);
    this.microsofRepo = Container.get(MicrosoftRepository);
    this.companyRepository = AppDataSource.getRepository(Company);
    this.remindRepository = Container.get(RemindRepository);
    this.lineQueueRepository = Container.get(LineQuequeRepository);
    this.commonRepository = Container.get(CommonRepository);
  }

  /**
   * Update todo task
   */
  syncTodoTasks = async (columnName: IColumnName): Promise<any> => {
    try {
      // update old line queue
      // await this.lineQueueRepository.updateStatusOfOldQueueTask();

      const companies = await this.companyRepository.find({
        relations: [
          'todoapps',
          'chattools',
          'admin_user',
          'companyConditions',
          'users.todoAppUsers',
        ],
        where: {
          todoapps: { id: Not(IsNull()) },
        },
      });

      for (const company of companies) {
        for (const todoapp of company.todoapps) {
          switch (todoapp.todo_app_code) {
            case Common.trello:
              await this.trelloRepo.syncTaskByUserBoards(company, todoapp);
              break;
            case Common.microsoft:
              await this.microsofRepo.syncTaskByUserBoards(company, todoapp);
              break;
            case Common.notion:
              await this.notionRepo.syncTaskByUserBoards(company, todoapp, columnName);
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
        relations: ['chattools', 'admin_user', 'companyConditions'],
      });

      //remind task for adminn
      for (const company of companies) {
        await this.lineQueueRepository.createTodayQueueTask(company, chattoolUsers);
        await this.remindRepository.remindTaskForAdminCompany(company);
      }

      //remind task for user by queue
      await this.remindRepository.remindTodayTaskForUser();
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  };
}
