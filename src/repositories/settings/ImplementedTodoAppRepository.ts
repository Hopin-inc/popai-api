import dataSource from "@/config/data-source";
import ImplementedTodoApp from "@/entities/settings/ImplementedTodoApp";
import logger from "@/logger/winston";
import { LoggerError } from "@/exceptions";

export const ImplementedTodoAppRepository = dataSource.getRepository(ImplementedTodoApp).extend({
  async getImplementTodoApp(companyId: number, todoappId: number): Promise<ImplementedTodoApp> {
    const implementTodoApp = await this.findOneBy({
      company_id: companyId,
      todoapp_id: todoappId,
    });

    if (!implementTodoApp) {
      logger.error(new LoggerError(
        `implemented_todo_appsのデータ(company_id=${companyId}, todoapp_id=${todoappId})がありません。`,
      ));
    }
    return implementTodoApp;
  },
});