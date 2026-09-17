import type { DateKey } from './dates';

/** Opens a specific day on the Today tab. The date lives in the URL, so browser back works. */
export function openDay(day: DateKey, today: DateKey) {
  window.location.hash = day >= today ? 'today' : `today/${day}`;
}
