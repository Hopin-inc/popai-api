import "moment-timezone";
import moment from "moment";

export function toJapanDateTime(utcDateString: Date, format = "YYYY/MM/DD HH:mm:ss"): Date {
  return new Date(
    moment
      .utc(utcDateString)
      .tz("Asia/Tokyo")
      .format(format)
  );
}

export function replaceString(str: string, search: string, replace: string): string {
  return str.replace(new RegExp(search, "g"), replace);
}

export function diffDays(startDate: Date, endDate: Date) {
  const startDay = moment(startDate).startOf("day");
  const endDay = moment(endDate).startOf("day");

  return endDay.diff(startDay, "days");
}

export function getDate(date: Date, format = "YYYY/MM/DD") {
  return moment(date).format(format);
}

export function sliceByNumber<T>(array: T[], n: number): T[][] {
  const length = Math.ceil(array.length / n);
  return new Array(length).fill(null).map((_, i) => array.slice(i * n, (i + 1) * n));
}

export const relativeRemindDays = (remindDays: number): string => {
  if (remindDays > 1) {
    return `${ remindDays.toString() }日前`;
  } else if (remindDays === 1) {
    return "昨日";
  } else if (remindDays === 0) {
    return "今日";
  } else if (remindDays === -1) {
    return "明日";
  } else if (remindDays === -2) {
    return "あさって";
  } else {
    return `${ (-remindDays).toString() }日後`;
  }
};
