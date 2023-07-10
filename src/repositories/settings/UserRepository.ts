import dataSource from "@/config/data-source";
import User from "@/entities/settings/User";
import { FindOptionsWhere } from "typeorm";

export const UserRepository = dataSource.getRepository(User).extend({
  async getUserByAppUserId(appUserId: string, companyId: string, relations: string[] = []): Promise<User[]> {
    const where: FindOptionsWhere<User> = {
      chatToolUser: { appUserId },
    };
    return await this.find({
      where,
      relations: [
        "chatToolUser",
        "company.implementedChatTool",
        "company.prospectConfigs",
        ...relations,
      ],
    });
  },
});
