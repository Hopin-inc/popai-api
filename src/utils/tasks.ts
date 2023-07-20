import Todo from "@/entities/transactions/Todo";
import ProspectConfig from "@/entities/settings/ProspectConfig";
import { toJapanDateTime } from "@/utils/datetime";
import { ProspectTargetFrequency, ProspectTargetFrom, ProspectTargetTo } from "@/consts/scheduler";
import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { ValueOf } from "@/types";
import Project from "@/entities/transactions/Project";
dayjs.extend(isSameOrBefore);

export const filterProspectTargetItems = <T extends Todo | Project>(todos: T[], config: ProspectConfig): T[] => {
  return todos.filter(todo => {
    return matchedFrom<T>(todo, config.from, config.fromDaysBefore, config.beginOfWeek)
      && matchedTo<T>(todo, config.to)
      && matchedFrequency<T>(todo, config.frequency, config.frequencyDaysBefore);
  });
};

const matchedFrom = <T extends Todo | Project>(
  item: T,
  from: ValueOf<typeof ProspectTargetFrom>,
  daysBefore: number | undefined,
  beginOfWeek: number | undefined,
) => {
  const today = dayjs().startOf("day");
  switch (from) {
    case ProspectTargetFrom.BEGIN_OF_DURATION:
      return dayjs(item.startDate).isSameOrBefore(today, "day");
    case ProspectTargetFrom.DAYS_BEFORE_DDL:
      const startOfDuration: Dayjs = dayjs(item.deadline)
        .startOf("day")
        .subtract(daysBefore, "day");
      return startOfDuration.isSameOrBefore(today, "day");
    case ProspectTargetFrom.START_OF_WEEK:
      const startOfWeek: Dayjs = dayjs(today);
      for (let i = 0; i < 7; i++) {
        if (startOfWeek.day() === beginOfWeek) {
          break;
        } else {
          startOfWeek.subtract(1, "day");
        }
      }
      return startOfWeek.isSameOrBefore(today, "day");
    case ProspectTargetFrom.DATE_CREATED:
      return true;
    default:
      return false;
  }
};

const matchedTo = <T extends Todo | Project>(
  item: T,
  to: ValueOf<typeof ProspectTargetTo>,
): boolean => {
  const endOfToday = dayjs().endOf("day");
  switch (to) {
    case ProspectTargetTo.DDL:
      return item.deadline ? endOfToday.isBefore(item.deadline, "day") : false;
    default:
      return false;
  }
};

const matchedFrequency = <T extends Todo | Project>(
  item: T,
  frequency: ValueOf<typeof ProspectTargetFrequency>,
  daysBefore: number[] | undefined,
): boolean => {
  const today = dayjs().startOf("day");
  switch (frequency) {
    case ProspectTargetFrequency.EVERYDAY:
      return true;
    case ProspectTargetFrequency.MID_DATE:
      const daysDiff = dayjs(today).diff(item.startDate, "day");
      const midDate: Dayjs = dayjs(today).subtract(Math.ceil(daysDiff / 2), "day");
      return midDate.isSame(today, "day");
    case ProspectTargetFrequency.DAYS_BEFORE_DDL:
      return daysBefore.some(n => dayjs(item.deadline).subtract(n, "day").isSame(today, "day"));
    default:
      return false;
  }
};
