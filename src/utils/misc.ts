import "moment-timezone";
import dayjs from "dayjs";
import { toJapanDateTime } from "@/utils/datetime";
import { roundMinutes } from "@/utils/array";


export const randomInt = (max: number, min: number = 0): number => Math.floor(Math.random() * (max - min) + min);

export const findMatchedTiming = <T extends { time: string }>(timings: T[], interval: number): T | null => {
  const now = toJapanDateTime(new Date());
  const executedTimeRounded = roundMinutes(now, interval, "floor");
  const time = dayjs(executedTimeRounded).format("HH:mm:ss");
  return timings.find(timing => timing.time === time);
};
