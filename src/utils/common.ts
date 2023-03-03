import "moment-timezone";
import moment from "moment";
import dayjs from "dayjs";
import Holidays, { HolidaysTypes } from "date-holidays";
import * as process from "process";

export function toJapanDateTime(date: Date, format = "YYYY/MM/DD HH:mm:ss"): Date {
  return date ? new Date(moment.utc(date).tz("Asia/Tokyo").format(format)) : null;
}

export function replaceString(str: string, search: string, replace: string): string {
  return str.replace(new RegExp(search, "g"), replace);
}

export function diffDays(startDate: Date, endDate: Date) {
  if (startDate && endDate) {
    const startDay = moment(startDate).startOf("day");
    const endDay = moment(endDate).startOf("day");
    return endDay.diff(startDay, "days");
  } else {
    return null;
  }
}

export function formatDatetime(date: Date, format = "YYYY/MM/DD") {
  return dayjs(date).format(format);
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
    return "明後日";
  } else {
    return `${ (-remindDays).toString() }日後`;
  }
};

export const getProcessTime = (t: ReturnType<typeof process.hrtime>): number => t[0] + t[1] * 1e-9;

export const getItemRandomly = <T>(arr: T[]): T => arr?.length ? arr[randomInt(arr.length)] : null;

export const randomInt = (max: number, min: number = 0): number => Math.floor(Math.random() * (max - min) + min);

export const getUniqueArray = <T>(arr: T[]): T[] => [...new Set(arr)];

export const extractDifferences = <T extends object>(arrA: T[], arrB: T[], key: keyof T): [T[], T[]] => {
  return [
    extractMembersOfANotInB(arrA, arrB, key),
    extractMembersOfANotInB(arrB, arrA, key)
  ];
};

export const extractMembersOfANotInB = <T extends object>(arrA: T[], arrB: T[], key: keyof T): T[] => {
  return arrA?.filter(a => !arrB.some(b => a[key] === b[key])) ?? [];
};

export const extractArrayDifferences = <T>(arrA: T[], arrB: T[]): [T[], T[]] => {
  return [
    extractArrayMembersOfANotInB(arrA, arrB),
    extractArrayMembersOfANotInB(arrB, arrA)
  ];
};

export const extractArrayMembersOfANotInB = <T>(arrA: T[], arrB: T[]): T[] => {
  return arrA?.filter(a => !arrB.some(b => a === b)) ?? [];
};

export const roundMinutes = (dt: Date, significance: number, method?: "floor" | "ceil" | "round"): Date => {
  const time = dayjs(dt);
  const newMinutes = (t: typeof time, s: typeof significance, m: typeof method) => {
    const minutes = t.minute();
    switch (m) {
      case "floor":
        return Math.floor(minutes / s) * s;
      case "ceil":
        return Math.ceil(minutes / s) * s;
      case "round":
      default:
        return Math.round(minutes / s) * s;
    }
  };
  return time.set("m", newMinutes(time, significance, method)).set("s", 0).set("ms", 0).toDate();
};

export const Sorter = {
  byDate: <T extends object>(key: keyof T, desc: boolean = false) => {
    return (a: T, b: T): number => {
      const dateA = dayjs(a[key] as Date);
      const dateB = dayjs(b[key] as Date);
      if (!desc) {
        return dateA.isAfter(dateB) ? 1 : dateA.isBefore(dateB) ? -1 : 0;
      } else {
        return dateB.isAfter(dateA) ? 1 : dateB.isBefore(dateA) ? -1 : 0;
      }
    };
  }
};

export const truncate = (str: string, max: number, countHalfAs: number = 1, countFullAs: number = 1): string => {
  let chars = 0;
  let truncatedStr = "";
  for (let i = 0; i < str.length; i++) {
    const character = str.charCodeAt(i);
    if (character >= 0x0 && character <= 0x7f) {
      chars += countHalfAs;
    } else {
      chars += countFullAs;
    }
    if (chars >= max) {
      return truncatedStr + "…";
    } else {
      truncatedStr += str[i];
    }
  }
  return truncatedStr;
};

export const isHolidayToday = (country: string = "JP", state?: string, region?: string): boolean => {
  const holidays = listHolidays(new Date(), country, state, region);
  return holidays.length > 0;
};

export const listHolidays = (date: Date, country: string, state?: string, region?: string): HolidaysTypes.Holiday[] => {
  const hd = new Holidays(country, state, region);
  return hd.isHoliday(date) || [];
};
