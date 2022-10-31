export function truncate(str: string, max: number = 40) {
  if (str.length <= max) {
    return str;
  }

  return str.substring(0, max - 3) + '...';
}
