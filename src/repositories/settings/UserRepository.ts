import dataSource from "@/config/data-source";
import User from "@/entities/settings/User";
import ReportingLine from "@/entities/settings/ReportingLine";

export const UserRepository = dataSource.getRepository(User).extend({
  async getChatToolUserByUserId(authKey: string): Promise<User[]> {
    return await this.find({
      where: { chattoolUsers: { auth_key: authKey } },
      relations: ["chattoolUsers.chattool", "company.implementedChatTools.chattool"],
    });
  },

  async getSuperiorUser(superiorUserIds: ReportingLine[]) {
    return this
      .createQueryBuilder("users")
      .where("id IN (:...ids)", {
        ids: superiorUserIds.map(superiorUserId => superiorUserId.superior_user_id),
      })
      .getMany();
  },
});