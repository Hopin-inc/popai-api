export function truncate(str: string, max: number = 15, sep: string) {
  const len = str.length;
  if (len > max) {
    // Default to elipsis
    sep = sep || '...';

    const seplen = sep.length;

    if (seplen > max) {
      return str.substring(len - max);
    }

    const n = -0.5 * (max - len - seplen);

    const center = len / 2;

    const front = str.substring(0, center - n);
    const back = str.substring(len - center + n); // without second arg, will automatically go to end of line.

    return front + sep + back;
  }

  return str;
}
