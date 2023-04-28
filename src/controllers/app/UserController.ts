import { Controller } from "tsoa";
import { UserRepository } from "@/repositories/settings/UserRepository";
import { ISelectItem, IUserConfig, IUserReportingLine } from "@/types/app";
import { IdOptional, ValueOf } from "@/types";
import { ChatToolId, TodoAppId } from "@/consts/common";
import User from "@/entities/settings/User";
import { ReportingLineRepository } from "@/repositories/settings/ReportingLineRepository";
import { extractArrayDifferences } from "@/utils/array";
import ReportingLine from "@/entities/settings/ReportingLine";
import { In } from "typeorm";

export default class UserController extends Controller {
  public async update(data: IdOptional<ISelectItem<string>>, companyId: string): Promise<ISelectItem<string>> {
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

  public async delete(userId: string, companyId: string): Promise<any> {
    await UserRepository.softDelete({ id: userId, companyId: companyId });
  }

  public async getConfigs(
    companyId: string,
    _chatToolId: ValueOf<typeof ChatToolId>,
    _todoAppId: ValueOf<typeof TodoAppId>,
  ): Promise<IUserConfig[]> {
    const users = await UserRepository.find({
      where: { companyId },
      relations: ["chatToolUser", "todoAppUser"],
      order: { id: "asc" },
    });
    return users.map(user => ({
      user: { id: user.id, name: user.name },
      chatToolUserId: user.chatToolUser?.appUserId,
      todoAppUserId: user.todoAppUser?.appUserId,
    }));
  }

  public async getReportingLines(companyId: string): Promise<IUserReportingLine[]> {
    const users = await UserRepository.find({
      where: { companyId: companyId },
      relations: ["superiorUserRefs.superiorUser"],
      order: { id: "asc" },
    });
    return users.map(user => ({
      user: { id: user.id, name: user.name },
      superiorUsers: user.superiorUsers.filter(u => u?.id).map(u => u.id),
    }));
  }

  public async updateReportingLines(
    superiorUserIds: string[],
    companyId: string,
    subordinateUserId: string,
  ): Promise<any> {
    const storedLines = await ReportingLineRepository.find({
      where: { subordinateUserId: subordinateUserId },
      // withDeleted: true,
    });
    const [addedSuperiors, deletedSuperiors] = extractArrayDifferences(
      superiorUserIds,
      storedLines.map(l => l.superiorUserId),
    );
    const addedLines = addedSuperiors.map(superiorUserId => ({
      ...new ReportingLine(subordinateUserId, superiorUserId),
      deleted_at: null,
    }));
    await Promise.all([
      ReportingLineRepository.upsert(addedLines, []),
      ReportingLineRepository.softDelete({
        subordinateUserId: subordinateUserId,
        superiorUserId: In(deletedSuperiors),
      }),
    ]);
  }
}
