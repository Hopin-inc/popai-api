import Todo from "@/entities/transactions/Todo";
import ProspectConfig from "@/entities/settings/ProspectConfig";
import { toJapanDateTime } from "@/utils/common";
import { ProspectTargetFrequency, ProspectTargetFrom, ProspectTargetTo } from "@/consts/scheduler";
import dayjs, { Dayjs } from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import { ValueOf } from "@/types";
dayjs.extend(isSameOrBefore);

export const filterProspectTargetTodos = (todos: Todo[], config: ProspectConfig): Todo[] => {
  return todos.filter(todo => {
    return matchedFrom(todo, config.from, config.from_days_before, config.begin_of_week)
      && matchedTo(todo, config.to)
      && matchedFrequency(todo, config.frequency, config.frequency_days_before);
  });
};

const matchedFrom = (
  todo: Todo,
  from: ValueOf<typeof ProspectTargetFrom>,
  daysBefore: number | undefined,
  beginOfWeek: number | undefined,
) => {
  const today = toJapanDateTime(new Date());
  switch (from) {
    case ProspectTargetFrom.BEGIN_OF_DURATION:
      return dayjs(todo.start_date).isSameOrBefore(today, "day");
    case ProspectTargetFrom.DAYS_BEFORE_DDL:
      const startOfDuration: Dayjs = dayjs(todo.deadline).subtract(daysBefore);
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

const matchedTo = (_todo: Todo, to: ValueOf<typeof ProspectTargetTo>): boolean => {
  switch (to) {
    case ProspectTargetTo.DDL:
      return true;
    default:
      return false;
  }
};

const matchedFrequency = (
  todo: Todo,
  frequency: ValueOf<typeof ProspectTargetFrequency>,
  daysBefore: number[] | undefined,
): boolean => {
  const today = toJapanDateTime(new Date());
  switch (frequency) {
    case ProspectTargetFrequency.EVERYDAY:
      return true;
    case ProspectTargetFrequency.MID_DATE:
      const daysDiff = dayjs(today).diff(todo.start_date, "day");
      const midDate: Dayjs = dayjs(today).subtract(Math.ceil(daysDiff / 2), "day");
      return midDate.isSame(today, "day");
    case ProspectTargetFrequency.DAYS_BEFORE_DDL:
      return daysBefore.some(n => dayjs(todo.deadline).subtract(n, "day").isSame(today, "day"));
    default:
      return false;
  }
};
