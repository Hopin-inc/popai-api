import dataSource from "@/config/data-source";
import Session from "@/entities/transactions/Session";
import { SessionData } from "express-session";
import { FindOptionsWhere } from "typeorm";

export const SessionRepository = dataSource.getRepository(Session).extend({
  async getSessionDataById(id: string): Promise<SessionData> {
    const where: FindOptionsWhere<Session> = { id };
    const session = await this.findOneBy(where);
    if (session) {
      return JSON.parse(session.json);
    }
  },
});
