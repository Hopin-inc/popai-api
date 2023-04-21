import moment from "moment/moment";
import dayjs from "dayjs";
import Holidays, { HolidaysTypes } from "date-holidays";

export const toJapanDateTime = (date: Date, format = "YYYY/MM/DD HH:mm:ss"): Date => {
  return date ? new Date(moment.utc(date).tz("Asia/Tokyo").format(format)) : null;
};

export const diffDays = (startDate: Date, endDate: Date) => {
  if (startDate && endDate) {
    const startDay = dayjs(startDate).startOf("d");
    const endDay = dayjs(endDate).startOf("d");
    return endDay.diff(startDay, "days");
  } else {
    return null;
  }
};

export const formatDatetime = (date: Date, format = "YYYY/MM/DD") => {
  return dayjs(date).format(format);
};

export const isHolidayToday = (country: string = "JP", state?: string, region?: string): boolean => {
  const now = toJapanDateTime(new Date());
  const holidays = listHolidays(now, country, state, region);
  return holidays.length > 0;
};

export const listHolidays = (date: Date, country: string, state?: string, region?: string): HolidaysTypes.Holiday[] => {
  const hd = new Holidays(country, state, region);
  return hd.isHoliday(date) || [];
};

export const includesDayOfToday = (days: number[]): boolean => {
  const now = toJapanDateTime(new Date());
  const day = dayjs(now).day();
  return days.includes(day);
};
