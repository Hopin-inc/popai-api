import dataSource from "@/config/data-source";
import Project from "@/entities/transactions/Project";
import { ValueOf } from "@/types";
import { TodoAppId } from "@/consts/common";
import { And, FindOptionsWhere, In, IsNull, LessThan, Not } from "typeorm";
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
      relations: ["projectUsers"],
    });
  },
  async findByAppIds(
    todoAppId: ValueOf<typeof TodoAppId>,
    appProjectIds: string[],
    companyId?: string,
  ) {
    return this.find({
      where: { todoAppId, appProjectId: In(appProjectIds), companyId },
      relations: ["projectUsers"],
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
    return await this.find({
      where: [
        { ...commonWhere, startDate: And(Not(IsNull()), LessThan(endDate)) },
        { ...commonWhere, startDate: IsNull(), deadline: LessThan(endDate) },
      ],
      relations: ["projectUsers.user.chatToolUser"],
    });
  },
});
