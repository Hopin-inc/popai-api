import dataSource from "@/config/data-source";
import Board from "@/entities/settings/Board";
import { FindOptionsWhere, IsNull } from "typeorm";

export const BoardRepository = dataSource.getRepository(Board).extend({
  async findOneByConfig(
    todoAppId: number,
    companyId: string,
    appBoardId?: string,
    relations: string[] = [],
  ): Promise<Board | null> {
    const where: FindOptionsWhere<Board> = {
      todoAppId,
      configs: { companyId, deletedAt: IsNull() },
      propertyUsages: { deletedAt: IsNull() },
    };
    if (appBoardId) {
      where.appBoardId = appBoardId;
    }
    return this.findOne({
      where,
      relations: ["configs.company", "propertyUsages", ...relations],
    });
  },
});
