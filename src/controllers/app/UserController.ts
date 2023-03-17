import { Controller } from "tsoa";
import { UserRepository } from "@/repositories/settings/UserRepository";
import { IUserConfig } from "@/types/app";
import { valueOf } from "@/types";
import { ChatToolId, TodoAppId } from "@/consts/common";

export default class UserController extends Controller {
  public async getList(
    companyId: number,
    chatToolId: valueOf<typeof ChatToolId>,
    todoAppId: valueOf<typeof TodoAppId>,
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
}