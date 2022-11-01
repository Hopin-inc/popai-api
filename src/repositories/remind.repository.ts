import { AppDataSource } from '../config/data-source';
import { InternalServerErrorException, LoggerError } from '../exceptions';
import { Repository } from 'typeorm';

import { Company } from './../entify/company.entity';
import MicrosoftRepository from './microsoft.repository';
import TrelloRepository from './trello.repository';
import { ITodoApp } from './../types';
import { Common } from './../const/common';
import { Service, Container } from 'typedi';
import logger from './../logger/winston';

@Service()
export default class Remindrepository {
  private trelloRepo: TrelloRepository;
  private microsofRepo: MicrosoftRepository;

  private companyRepository: Repository<Company>;

  constructor() {
    this.trelloRepo = Container.get(TrelloRepository);
    this.microsofRepo = Container.get(MicrosoftRepository);
    this.companyRepository = AppDataSource.getRepository(Company);
  }

  remindCompany = async (): Promise<void> => {
    try {
      const companies = await this.companyRepository.find({
        relations: ['todoapps'],
      });

      for (const company of companies) {
        if (company.todoapps.length) {
          this.remindCompanyApp(company.id, company.todoapps);
        }
      }
    } catch (error) {
      logger.error(new LoggerError(error.message));
      throw new InternalServerErrorException(error.message);
    }
  };

  remindCompanyApp = async (companyId: number, todoapps: ITodoApp[]): Promise<void> => {
    for (const todoapp of todoapps) {
      switch (todoapp.todo_app_code) {
        case Common.trello:
          this.trelloRepo.remindUsers(companyId, todoapp.id);
          break;
        case Common.microsoft:
          this.microsofRepo.remindUsers(companyId, todoapp.id);
          break;
        default:
          break;
      }
    }
  };
}
