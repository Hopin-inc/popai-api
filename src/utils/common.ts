import 'moment-timezone';
import moment from 'moment';

export function truncate(str: string, max: number = 40): string {
  if (str.length <= max) {
    return str;
  }

  return str.substring(0, max - 3) + '...';
}

export function toJapanDateTime(utcDateString: Date): Date {
  return moment
    .utc(utcDateString)
    .tz('Asia/Tokyo')
    .toDate();
}
