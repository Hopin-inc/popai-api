import dataSource from "@/config/data-source";
import Board from "@/entities/settings/Board";
import { FindOptionsWhere, In, IsNull } from "typeorm";
import BoardConfig from "@/entities/settings/BoardConfig";

export const BoardRepository = dataSource.getRepository<Board>(Board).extend({
  async findByConfig(
    todoAppId: number,
    companyId: number,
    sectionIds: number[] = [],
    relations: string[] = [],
  ): Promise<Board[]> {
    const boardConfigQuery: FindOptionsWhere<BoardConfig> = sectionIds.length ? { section_id: In(sectionIds) } : {};
    return this.find({
      where: {
        todo_app_id: todoAppId,
        config: { ...boardConfigQuery, company_id: companyId, deleted_at: IsNull() },
        propertyUsages: { deleted_at: IsNull() },
      },
      relations: ["configs.company", "configs.section", "propertyUsages", ...relations],
    });
  },
  async findOneByConfig(
    todoAppId: number,
    companyId: number,
    boardId?: string,
    sectionId: number = null,
    relations: string[] = [],
  ): Promise<Board | null> {
    return this.findOne({
      where: {
        todo_app_id: todoAppId,
        ...(boardId ? { app_board_id: boardId } : {}),
        configs: {
          section_id: sectionId ? sectionId : IsNull(),
          company_id: companyId,
          deleted_at: IsNull(),
        },
        propertyUsages: { deleted_at: IsNull() },
      },
      relations: ["configs.company", "configs.section", "propertyUsages", ...relations],
    });
  },
});
