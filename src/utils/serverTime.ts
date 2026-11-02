// SQL-backed API timestamps without an offset represent UTC, not browser local time.
export function parseServerTime(value: string): number {
  return Date.parse(/Z|[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`);
}
