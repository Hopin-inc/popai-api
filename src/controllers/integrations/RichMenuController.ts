import { Controller } from "tsoa";

import { ChatToolId } from "@/consts/common";
import logger from "@/logger/winston";
import LineBot from "@/config/line-bot";
import { ChatToolRepository } from "@/repositories/master/ChatToolRepository";
import { ChatToolUserRepository } from "@/repositories/settings/ChatToolUserRepository";

export default class RichMenuController extends Controller {
  public async updateRichMenu(demoRichMenuId: string): Promise<any> {
    const chattool = await ChatToolRepository.findOneBy({
      id: ChatToolId.LINE,
    });

    if (!chattool) {
      logger.error("LINE is not implemented yet!");
      return;
    }

    // get rich menu
    try {
      await LineBot.getRichMenu(demoRichMenuId);
    } catch (error) {
      logger.error("Demo rich menu id not found!");
      throw new Error("Demo rich menu id not found!");
    }
    // get demo users
    const lineUsers = await ChatToolUserRepository
      .createQueryBuilder("chat_tool_users")
      .innerJoinAndSelect("chat_tool_users.user", "user")
      .innerJoinAndSelect("user.company", "company")
      // .where('company.is_demo = :is_demo', { is_demo: true })
      .andWhere("chat_tool_users.chattool_id = :chattool_id", { chattool_id: chattool.id })
      .andWhere("chat_tool_users.auth_key is not null")
      .getMany();

    const demolineIds = lineUsers
      .filter(lineUser => lineUser.user.company.is_demo)
      .map(lineUser => lineUser.auth_key);

    const defaultlineIds = lineUsers
      .filter(lineUser => !lineUser.user.company.is_demo)
      .map(lineUser => lineUser.auth_key);

    // set default rich menu
    // await LineBot.setDefaultRichMenu(defaultRichMenuId);

    // unlink
    if (defaultlineIds.length) {
      await LineBot.unlinkRichMenusFromMultipleUsers(defaultlineIds);
    }

    // set demo reich menu
    if (demolineIds.length) {
      await LineBot.linkRichMenuToMultipleUsers(demoRichMenuId, demolineIds);
    }

    return;
  }
}
