import dataSource from "@/config/data-source";
import Session from "@/entities/transactions/Session";
import { SessionData } from "express-session";

export const SessionRepository = dataSource.getRepository(Session).extend({
  async getSessionDataById(id: string): Promise<SessionData> {
    const session = await this.findOneById(id);
    if (session) {
      return JSON.parse(session.json);
    }
  },
});
