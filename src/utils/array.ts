import dayjs from "dayjs";
import { randomInt } from "@/utils/misc";

export const sliceByNumber = <T>(array: T[], n: number): T[][] => {
  const length = Math.ceil(array.length / n);
  return new Array(length).fill(null).map((_, i) => array.slice(i * n, (i + 1) * n));
};

export const getItemRandomly = <T>(arr: T[]): T => arr?.length ? arr[randomInt(arr.length)] : null;

export const getUniqueArray = <T>(arr: T[]): T[] => [...new Set(arr)];

export const extractDifferences = <T extends object>(arrA: T[], arrB: T[], key: keyof T): [T[], T[]] => {
  return [
    extractMembersOfANotInB(arrA, arrB, key),
    extractMembersOfANotInB(arrB, arrA, key),
  ];
};

export const extractMembersOfANotInB = <T extends object>(arrA: T[], arrB: T[], key: keyof T): T[] => {
  return arrA?.filter(a => !arrB.some(b => a[key] === b[key])) ?? [];
};

export const extractArrayDifferences = <T>(arrA: T[], arrB: T[]): [T[], T[]] => {
  return [
    extractArrayMembersOfANotInB(arrA, arrB),
    extractArrayMembersOfANotInB(arrB, arrA),
  ];
};

export const extractArrayMembersOfANotInB = <T>(arrA: T[], arrB: T[]): T[] => {
  return arrA?.filter(a => !arrB.includes(a)) ?? [];
};

export const roundMinutes = (dt: Date, interval: number, method?: "floor" | "ceil" | "round"): Date => {
  const time = dayjs(dt);
  const newMinutes = (t: typeof time, s: typeof interval, m: typeof method) => {
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
  return time.set("m", newMinutes(time, interval, method)).set("s", 0).set("ms", 0).toDate();
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
  },
};
