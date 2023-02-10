import "moment-timezone";
import moment from "moment";
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
    return "明後日";
  } else {
    return `${ (-remindDays).toString() }日後`;
  }
};

export const getProcessTime = (t: ReturnType<typeof process.hrtime>): number => t[0] + t[1] * 1e-9;

export const getItemRandomly = <T>(arr: T[]): T => arr?.length ? arr[randomInt(arr.length)] : null;

export const randomInt = (max: number, min: number = 0): number => Math.floor(Math.random() * (max - min) + min);

// export const getUniqueArray = <T>(arr: T[]): T[] => [...new Set(arr)];

export const extractDifferences = <T extends object>(arrA: T[], arrB: T[], key: keyof T): [T[], T[]] => {
  return [
    extractMembersOfANotInB(arrA, arrB, key),
    extractMembersOfANotInB(arrB, arrA, key)
  ];
};

export const extractMembersOfANotInB = <T extends object>(arrA: T[], arrB: T[], key: keyof T): T[] => {
  return arrA?.filter(a => !arrB.some(b => a[key] === b[key])) ?? [];
};
