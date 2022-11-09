import 'moment-timezone';
import moment from 'moment';

export function truncate(str: string, max: number = 40): string {
  if (str.length <= max) {
    return str;
  }

  return str.substring(0, max - 3) + '...';
}

export function toJapanDateTime(utcDateString: Date): Date {
  return new Date(
    moment
      .utc(utcDateString)
      .tz('Asia/Tokyo')
      .format('YYYY/MM/DD HH:mm:ss')
  );
}

export function replaceString(str: string, search: string, replace: string): string {
  return str.replace(new RegExp(search, 'g'), replace);
}
