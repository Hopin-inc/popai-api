import 'moment-timezone';
import moment from 'moment';

export function truncate(str: string, max: number = 40): string {
  if (str.length <= max) {
    return str;
  }

  return str.substring(0, max - 3) + '...';
}

export function toJapanDateTime(utcDateString: Date, format = 'YYYY/MM/DD HH:mm:ss'): Date {
  return new Date(
    moment
      .utc(utcDateString)
      .tz('Asia/Tokyo')
      .format(format)
  );
}

export function replaceString(str: string, search: string, replace: string): string {
  return str.replace(new RegExp(search, 'g'), replace);
}

export function diffDays(startDate: Date, endDate: Date) {
  const startDay = moment(startDate).startOf('day');
  const endDay = moment(endDate).startOf('day');

  return endDay.diff(startDay, 'days');
}

export function getDate(date: Date, format = 'YYYY/MM/DD') {
  return moment(date).format(format);
}

export function sliceByNumber<T>(array: T[], n: number): T[][] {
  const length = Math.ceil(array.length / n);
  return new Array(length).fill(null).map((_, i) => array.slice(i * n, (i + 1) * n));
}
