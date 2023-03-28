import { Controller } from "tsoa";
import { UserRepository } from "@/repositories/settings/UserRepository";
import { ISelectItem, IUserConfig, IUserReportingLine } from "@/types/app";
import { IdOptional, ValueOf } from "@/types";
import { ChatToolId, TodoAppId } from "@/consts/common";
import User from "@/entities/settings/User";
import { ReportingLineRepository } from "@/repositories/settings/ReportingLineRepository";
import { extractArrayDifferences } from "@/utils/common";
import ReportingLine from "@/entities/settings/ReportingLine";
import { In } from "typeorm";

export default class UserController extends Controller {
  public async update(data: IdOptional<ISelectItem>, companyId: number): Promise<ISelectItem> {
    const { id, ...updatedData } = data;
    const user = await UserRepository.findOneBy({ id });
    if (id && user) {
      await UserRepository.update(id, updatedData);
      return { ...data, id };
    } else {
      const user = new User(updatedData.name, companyId);
      const result = await UserRepository.save(user);
      return { ...data, id: result.id };
    }
  }

  public async delete(userId: number, companyId: number): Promise<any> {
    await UserRepository.softDelete({ id: userId, company_id: companyId });
  }
  
  public async getConfigs(
    companyId: number,
    chatToolId: ValueOf<typeof ChatToolId>,
    todoAppId: ValueOf<typeof TodoAppId>,
  ): Promise<IUserConfig[]> {
    const users = await UserRepository.find({
      where: { company_id: companyId },
      relations: ["chattoolUsers.chattool", "todoAppUsers.todoApp"],
      order: { id: "asc" },
    });
    return users.map(user => ({
      user: { id: user.id, name: user.name },
      chatToolUserId: user.chattoolUsers.find(cu => cu.chattool_id === chatToolId)?.auth_key,
      todoAppUserId: user.todoAppUsers.find(tu => tu.todoapp_id === todoAppId)?.user_app_id,
    }));
  }

  public async getReportingLines(companyId: number): Promise<IUserReportingLine[]> {
    const users = await UserRepository.find({
      where: { company_id: companyId },
      relations: ["superiorUserRefs.superiorUser"],
      order: { id: "asc" },
    });
    return users.map(user => ({
      user: { id: user.id, name: user.name },
      superiorUsers: user.superiorUsers.map(u => u.id),
    }));
  }

  public async updateReportingLines(
    superiorUserIds: number[],
    companyId: number,
    subordinateUserId: number,
  ): Promise<any> {
    const storedLines = await ReportingLineRepository.find({
      where: { subordinate_user_id: subordinateUserId },
      // withDeleted: true,
    });
    const [addedSuperiors, deletedSuperiors] = extractArrayDifferences(
      superiorUserIds,
      storedLines.map(l => l.superior_user_id),
    );
    const addedLines = addedSuperiors.map(superiorUserId => ({
      ...new ReportingLine(subordinateUserId, superiorUserId),
      deleted_at: null,
    }));
    await Promise.all([
      ReportingLineRepository.upsert(addedLines, []),
      ReportingLineRepository.softDelete({
        subordinate_user_id: subordinateUserId,
        superior_user_id: In(deletedSuperiors),
      }),
    ]);
  }
}