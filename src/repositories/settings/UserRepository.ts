import dataSource from "@/config/data-source";
import User from "@/entities/settings/User";

export const UserRepository = dataSource.getRepository(User).extend({
  async getChatToolUserByUserId(authKey: string, relations: string[] = []): Promise<User[]> {
    return await this.find({
      where: { chatToolUsers: { auth_key: authKey } },
      relations: ["chatToolUser", "company.implementedChatTool", ...relations],
    });
  },
});
