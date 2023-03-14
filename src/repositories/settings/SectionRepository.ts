import dataSource from "@/config/data-source";
import Section from "@/entities/settings/Section";
import { In } from "typeorm";
import Company from "@/entities/settings/Company";
import TodoApp from "@/entities/masters/TodoApp";
import User from "@/entities/settings/User";

export const SectionRepository = dataSource.getRepository(Section).extend({
  async getSectionIds(
    company: Company,
    todoApp: TodoApp,
    labelIds: string[],
  ): Promise<number[]> {
    if (labelIds) {
      const registeredLabelRecords: Section[] = await this.find({
        where: {
          company_id: company.id,
          todoapp_id: todoApp.id,
          label_id: In(labelIds),
        },
        select: ["id"],
      });

      return registeredLabelRecords.map(record => record.id);
    }
  },

  async getSections(companyId: number, todoappId: number): Promise<Section[]> {
    return await this
      .createQueryBuilder("sections")
      .innerJoinAndSelect(
        "sections.boardAdminUser",
        "users",
        "sections.board_admin_user_id = users.id AND users.company_id = :companyId",
        { companyId },
      )
      .innerJoinAndSelect(
        "users.todoAppUsers",
        "todo_app_users",
        "users.id = todo_app_users.employee_id AND todo_app_users.todoapp_id = :todoappId",
        { todoappId },
      )
      .where("sections.company_id = :companyId", { companyId })
      .andWhere("sections.todoapp_id = :todoappId", { todoappId })
      .andWhere("sections.board_id IS NOT NULL")
      .getMany();
  },

  async getBoardAdminUser(sectionId: number): Promise<User> {
    const section = await this.findOne({
      where: { id: sectionId },
      relations: ["boardAdminUser", "boardAdminUser.todoAppUsers"],
    });
    return section.boardAdminUser;
  },
});