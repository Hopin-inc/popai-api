import dataSource from "@/config/data-source";
import Project from "@/entities/transactions/Project";
import { ValueOf } from "@/types";
import { TodoAppId } from "@/consts/common";
import { And, FindManyOptions, FindOptionsWhere, In, IsNull, LessThan, Not } from "typeorm";
import Company from "@/entities/settings/Company";
import User from "@/entities/settings/User";
import dayjs from "dayjs";

export const ProjectRepository = dataSource.getRepository(Project).extend({
  async findOneByAppProjectId(
    todoAppId: ValueOf<typeof TodoAppId>,
    appProjectId: string,
    companyId?: string,
  ): Promise<Project> {
    return this.findOne({
      where: { todoAppId, appProjectId, companyId },
      relations: ["projectUsers.user", "reminds"],
    });
  },
  async findByAppIds(
    todoAppId: ValueOf<typeof TodoAppId>,
    appProjectIds: string[],
    companyId?: string,
  ) {
    return this.find({
      where: { todoAppId, appProjectId: In(appProjectIds), companyId },
      relations: ["projectUsers", "reminds"],
    });
  },
  async getActiveProjects(company: Company, user?: User): Promise<Project[]> {
    const filterByUser: FindOptionsWhere<Project> = user
      ? { projectUsers: { userId: user.id } }
      : {};
    const commonWhere: FindOptionsWhere<Project> = {
      companyId: company.id,
      isDone: false,
      isClosed: false,
      ...filterByUser,
    };
    const endDate = dayjs().endOf("day").toDate();
    return await this.find(<FindManyOptions<Project>>{
      where: [
        { ...commonWhere, startDate: And(Not(IsNull()), LessThan(endDate)) },
        { ...commonWhere, startDate: IsNull(), deadline: LessThan(endDate) },
      ],
      order: { deadline: "asc" },
      relations: ["projectUsers.user.chatToolUser"],
    });
  },
  async getRemindProjects(
    companyId: string,
    delayed: boolean,
    limit?: number,
  ): Promise<Project[]> {
    const today = dayjs().startOf("day").toDate();
    const delayedFilter: FindOptionsWhere<Project> = delayed ? {
      deadline: LessThan(today),
      isDone: false,
      isClosed: false,
    } : {};
    const projects: Project[] = await this.find(<FindManyOptions<Project>>{
      where: { companyId, ...delayedFilter },
      order: { deadline: "asc" },
      relations: ["projectUsers.user.chatToolUser", "reminds"],
    });
    return projects.filter(project => !limit || project.reminds?.length <= limit);
  },
});
