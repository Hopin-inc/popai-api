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
import { UserConfigViewRepository } from "@/repositories/views/UserConfigViewRepository";
import { TodoAppConfigViewRepository } from "@/repositories/views/TodoAppConfigViewRepository";

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
      const force = !!company;
      const where: FindOptionsWhere<Company> = company ? { id: company.id } : {};
      const [companies, userConfigs, todoAppConfigs] = await Promise.all([
        CompanyRepository.find({
          where,
          relations: [
            "implementedTodoApps",
            "implementedChatTool",
            "users.todoAppUser",
            "projects",
            "boards",
          ],
        }),
        UserConfigViewRepository.find(),
        TodoAppConfigViewRepository.find(),
      ]);
      await runInOrder(
        companies.filter(c => {
          const userConfig = userConfigs.find(uc => uc.companyId === c.id);
          return userConfig?.isValid
            && !c.boards.some(b => {
              const todoAppConfig = todoAppConfigs.find(tac => tac.boardId === b.id);
              return !todoAppConfig?.isValid;
            });
        }),
        async companiesChunk => {
          await Promise.all(companiesChunk.map(async company => {
            const { implementedTodoApps } = company;
            if (implementedTodoApps.length > 0) {
              const logMeta = {
                company: company.id,
                todoApp: implementedTodoApps[0].todoAppId,
              };
              logger.info(`Updating todos for company ${ company.id }`, logMeta);
              try {
                switch (implementedTodoApps[0].todoAppId) {
                  case TodoAppId.NOTION:
                    await this.notionRepository.syncTodos(company, force);
                    break;
                  default:
                    break;
                }
              } catch (error) {
                logger.error(error.message, error);
              }
            }
          }));
        },
        ParallelChunkUnit.SYNC_TODOS,
      );
    } catch (error) {
      logger.error(error.message, error);
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
