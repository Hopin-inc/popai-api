import { FindOptionsWhere } from "typeorm";
import { Service, Container } from "typedi";

import Company from "@/entities/settings/Company";
import Todo from "@/entities/transactions/Todo";
import TodoAppUser from "@/entities/settings/TodoAppUser";

import SlackRepository from "@/repositories/SlackRepository";
import NotionRepository from "@/repositories/NotionRepository";
import { TodoAppId } from "@/consts/common";
import logger from "@/libs/logger";
import { CompanyRepository } from "@/repositories/settings/CompanyRepository";
import NotionClient from "@/integrations/NotionClient";
import { ParallelChunkUnit } from "@/consts/parallels";
import { runInOrder } from "@/utils/process";

@Service()
export default class TaskService {
  private notionRepository: NotionRepository;
  private slackRepository: SlackRepository;

  constructor() {
    this.notionRepository = Container.get(NotionRepository);
    this.slackRepository = Container.get(SlackRepository);
  }

  public async syncTodos(company: Company = null): Promise<any> {
    try {
      const where: FindOptionsWhere<Company> = company ? { id: company.id } : {};
      const companies = await CompanyRepository.find({
        where,
        relations: ["implementedTodoApp", "implementedChatTool", "users.todoAppUser"],
      });
      await runInOrder(
        companies,
        async companiesChunk => {
          await Promise.all(companiesChunk.map(async company => {
            const { implementedTodoApp } = company;
            const logMeta = {
              company: company.name,
              todoApp: company.implementedTodoApp.todoAppId,
            };
            logger.info(`Start: syncTodos { company: ${ company.id }, section: ALL }`, logMeta);
            try {
              switch (implementedTodoApp.todoAppId) {
                case TodoAppId.NOTION:
                  await this.notionRepository.syncTodos(company);
                  break;
                default:
                  break;
              }
              logger.info(`Finish: syncTodos { company: ${ company.id }, section: ALL }`, logMeta);
            } catch (error) {
              logger.error(error);
            }
          }));
        },
        ParallelChunkUnit.SYNC_TODOS,
      );
    } catch (error) {
      logger.error(error);
    }
  }

  public async update(
    todoAppRegId: string,
    todo: Todo,
    todoAppUser: TodoAppUser,
  ) {
    switch (todo.todoAppId) {
      case TodoAppId.NOTION:
        const notionClient = await NotionClient.init(todo.companyId);
        if (notionClient) {
          await this.notionRepository.updateTodo(todoAppRegId, todo, todoAppUser, notionClient);
        }
        return;
    }
  }
}
