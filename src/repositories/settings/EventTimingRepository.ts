import dataSource from "@/config/data-source";
import EventTiming from "@/entities/settings/EventTiming";
import { ValueOf } from "@/types";
import { EventType } from "@/consts/common";
import { roundMinutes, toJapanDateTime } from "@/utils/common";
import dayjs from "dayjs";

export const EventTimingRepository = dataSource.getRepository(EventTiming).extend({
  async getEventTargetCompanies(
    significance: number,
    event: ValueOf<typeof EventType>,
  ): Promise<EventTiming[]> {
    const now = toJapanDateTime(new Date());
    const executedTimeRounded = roundMinutes(now, significance, "floor");
    const time = dayjs(executedTimeRounded).format("HH:mm:ss");
    const day = dayjs(now).day();
    const timings = await this.find({
      where: { time, event },
      relations: [
        "company.sections",
        "company.users.chattoolUsers.chattool",
        "company.implementedChatTools.chattool",
        "company.adminUser.chattoolUsers.chattool",
      ],
    });
    return timings.filter(t => t.days_of_week.includes(day));
  },

});