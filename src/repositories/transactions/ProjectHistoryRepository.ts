import dataSource from "@/config/data-source";
import ProjectHistory from "@/entities/transactions/ProjectHistory";
import { IProjectHistoryOption } from "@/types";
import { FindOptionsOrder, FindOptionsWhere } from "typeorm";
import { TodoHistoryProperty as Property } from "@/consts/common";
import Company from "@/entities/settings/Company";
import Project from "@/entities/transactions/Project";

export const ProjectHistoryRepository = dataSource.getRepository(ProjectHistory).extend({
  async saveHistories(options: IProjectHistoryOption[]): Promise<void> {
    const histories = options.map(history => {
      const { id, property, action, info } = history;
      return new ProjectHistory({
        project: id,
        property,
        action,
        appUpdatedAt: new Date(),
        ...info,
      });
    });
    await this.save(histories);
  },
  async getLatestDelayedHistory(project: Project): Promise<ProjectHistory | null> {
    const where: FindOptionsWhere<ProjectHistory> = {
      projectId: project.id,
      property: Property.IS_DELAYED,
    };
    const order: FindOptionsOrder<ProjectHistory> = {
      createdAt: "DESC",
    };
    return this.findOne({ where, order });
  },
  async getLatestRecoveredHistory(project: Project): Promise<ProjectHistory | null> {
    const where: FindOptionsWhere<ProjectHistory> = {
      projectId: project.id,
      property: Property.IS_RECOVERED,
    };
    const order: FindOptionsOrder<ProjectHistory> = {
      createdAt: "DESC",
    };
    return this.findOne({ where, order });
  },
  async getLastUpdatedDate(company: Company, todoAppId: number): Promise<Date | null> {
    const companyId = company.id;
    const where: FindOptionsWhere<ProjectHistory> = { project: { companyId, todoAppId } };
    const order: FindOptionsOrder<ProjectHistory> = { appUpdatedAt: "DESC" };
    const history: ProjectHistory = await this.findOne({ where, order, relations: ["project"] });
    return history?.appUpdatedAt ?? null;
  },
});
