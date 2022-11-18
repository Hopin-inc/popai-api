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

@Service()
export default class TaskService {
  private trelloRepo: TrelloRepository;
  private microsofRepo: MicrosoftRepository;
  private companyRepository: Repository<Company>;
  private remindRepository: RemindRepository;

  constructor() {
    this.trelloRepo = Container.get(TrelloRepository);
    this.microsofRepo = Container.get(MicrosoftRepository);
    this.companyRepository = AppDataSource.getRepository(Company);
    this.remindRepository = Container.get(RemindRepository);
  }

  /**
   * Update todo task
   */
  syncTodoTasks = async (): Promise<any> => {
    try {
      const companies = await this.companyRepository.find({
        relations: ['todoapps', 'chattools', 'admin_user', 'companyConditions'],
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
      const companies = await this.companyRepository.find({
        relations: ['chattools', 'admin_user', 'companyConditions'],
      });

      //remind task for user by queue
      this.remindRepository.updateStatusOfOldQueueTask();
      this.remindRepository.remindTodayTaskForUser();

      //remind task for adminn
      for (const company of companies) {
        this.remindRepository.remindTaskForAdminCompany(company);
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  };
}
