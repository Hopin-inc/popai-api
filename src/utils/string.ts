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

export const extractDomain = (str: string): string => str.match(/^https?:\/{2,}(.*?)(?:\/|\?|#|$)/)[1];
