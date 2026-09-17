// Dates are stored as local calendar keys ("YYYY-MM-DD") so a habit ticked at
// 11pm never drifts into the next day because of time zones.

export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Noon avoids DST edge cases when adding days. */
export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function todayKey(now: Date = new Date()): DateKey {
  return toKey(now);
}

export function addDays(key: DateKey, n: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

/** ISO weekday: 0 = Monday … 6 = Sunday. */
export function weekday(key: DateKey): number {
  return (fromKey(key).getDay() + 6) % 7;
}

export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -weekday(key));
}

export function startOfMonth(key: DateKey): DateKey {
  return key.slice(0, 8) + '01';
}

export function endOfMonth(key: DateKey): DateKey {
  const d = fromKey(startOfMonth(key));
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toKey(d);
}

/** Inclusive range of keys from a to b. */
export function range(a: DateKey, b: DateKey): DateKey[] {
  const out: DateKey[] = [];
  for (let k = a; k <= b; k = addDays(k, 1)) out.push(k);
  return out;
}

export function minKey(...keys: DateKey[]): DateKey {
  return keys.reduce((m, k) => (k < m ? k : m));
}

export function maxKey(...keys: DateKey[]): DateKey {
  return keys.reduce((m, k) => (k > m ? k : m));
}

export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const WEEKDAY_LETTER = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function formatLong(key: DateKey): string {
  return fromKey(key).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function formatShort(key: DateKey): string {
  return fromKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function formatMonth(key: DateKey): string {
  return fromKey(key).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}
