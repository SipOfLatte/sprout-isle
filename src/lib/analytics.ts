// Aggregations behind the Insights page. Pure functions over the raw logs:
// period windows, partial-credit completion scores, rolling means, a weekday
// profile and a pairwise correlation (phi coefficient) between habits.

import {
  addDays,
  diffDays,
  endOfMonth,
  formatMonth,
  formatShort,
  minKey,
  range,
  startOfMonth,
  startOfWeek,
  weekday,
  type DateKey,
} from './dates';
import {
  amountOn,
  firstDay,
  isActiveOn,
  isDone,
  isPinnedTo,
  type Progress,
} from './engine';
import type { AppState, Area, Habit } from './types';

export type PeriodKind = 'week' | 'month';
export type AreaFilter = Area | 'all';

export interface Period {
  kind: PeriodKind;
  start: DateKey;
  end: DateKey;
  label: string;
}

export function periodFor(kind: PeriodKind, anchor: DateKey): Period {
  if (kind === 'week') {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    return { kind, start, end, label: `${formatShort(start)} – ${formatShort(end)}` };
  }
  const start = startOfMonth(anchor);
  return { kind, start, end: endOfMonth(anchor), label: formatMonth(anchor) };
}

export function shiftPeriod(p: Period, dir: -1 | 1): Period {
  const anchor = dir === 1 ? addDays(p.end, 1) : addDays(p.start, -1);
  return periodFor(p.kind, anchor);
}

/** Every habit in an area, deleted ones included, for totals that should match your XP and history. */
export function habitsFor(state: AppState, area: AreaFilter): Habit[] {
  return state.habits.filter((h) => area === 'all' || h.area === area);
}

/** Habits to list one by one in charts. Deleted habits are left out. */
export function listedHabitsFor(state: AppState, area: AreaFilter): Habit[] {
  return habitsFor(state, area).filter((h) => !h.deletedOn);
}

/** Partial credit: 5 of 8 glasses scores 0.625. */
export function score(habit: Habit, amount: number): number {
  return Math.min(amount / habit.target, 1);
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

// ---- Daily completion -------------------------------------------------------

export interface DailyPoint {
  day: DateKey;
  /** Mean score of the habits pinned to this day; null if none or in the future. */
  score: number | null;
  due: number;
  done: number;
}

export function dailySeries(
  state: AppState,
  start: DateKey,
  end: DateKey,
  today: DateKey,
  area: AreaFilter,
): DailyPoint[] {
  const habits = habitsFor(state, area);
  return range(start, end).map((day) => {
    if (day > today) return { day, score: null, due: 0, done: 0 };
    const scores: number[] = [];
    let done = 0;
    for (const h of habits) {
      if (!isPinnedTo(h, day)) continue;
      const amount = amountOn(state, h.id, day);
      scores.push(score(h, amount));
      if (isDone(h, amount)) done++;
    }
    return { day, score: mean(scores), due: scores.length, done };
  });
}

/** Trailing mean over the last `window` non-null values' positions. */
export function rollingMean(values: (number | null)[], window: number): (number | null)[] {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1).filter((v): v is number => v !== null);
    return values[i] === null ? null : mean(slice);
  });
}

// ---- Per-habit rates --------------------------------------------------------

export interface HabitRate {
  habit: Habit;
  /** 0..1, weighted completion over the window. */
  rate: number;
  done: number;
  expected: number;
}

export function habitRates(
  state: AppState,
  start: DateKey,
  end: DateKey,
  today: DateKey,
  area: AreaFilter,
): HabitRate[] {
  const last = minKey(end, today);
  if (last < start) return [];
  const out: HabitRate[] = [];

  for (const habit of habitsFor(state, area)) {
    const s = habit.schedule;
    let credit = 0;
    let done = 0;
    let expected = 0;

    if (s.kind === 'weekly') {
      // Scale the weekly quota to the part of each week inside the window.
      for (let ws = startOfWeek(start); ws <= last; ws = addDays(ws, 7)) {
        const days = range(ws, addDays(ws, 6)).filter((d) => d >= start && d <= last && isActiveOn(habit, d));
        if (!days.length) continue;
        const quota = Math.max(1, Math.round((s.times * days.length) / 7));
        const count = days.filter((d) => isDone(habit, amountOn(state, habit.id, d))).length;
        credit += Math.min(count, quota);
        done += count;
        expected += quota;
      }
    } else {
      for (const d of range(start, last)) {
        if (!isPinnedTo(habit, d)) continue;
        const amount = amountOn(state, habit.id, d);
        credit += score(habit, amount);
        if (isDone(habit, amount)) done++;
        expected++;
      }
    }

    if (expected > 0) out.push({ habit, rate: credit / expected, done, expected });
  }
  return out.sort((a, b) => b.rate - a.rate);
}

// ---- Habit × day grid -------------------------------------------------------

export type CellState = 'done' | 'partial' | 'missed' | 'rest' | 'future' | 'inactive';

export interface GridCell {
  day: DateKey;
  amount: number;
  value: number;
  state: CellState;
}

export function habitGrid(
  state: AppState,
  start: DateKey,
  end: DateKey,
  today: DateKey,
  area: AreaFilter,
): { habit: Habit; cells: GridCell[] }[] {
  const days = range(start, end);
  return listedHabitsFor(state, area)
    .filter((h) => days.some((d) => isActiveOn(h, d)))
    .map((habit) => ({
      habit,
      cells: days.map((day): GridCell => {
        const amount = amountOn(state, habit.id, day);
        const value = score(habit, amount);
        let cellState: CellState;
        if (day > today) cellState = 'future';
        else if (!isActiveOn(habit, day)) cellState = 'inactive';
        else if (isDone(habit, amount)) cellState = 'done';
        else if (amount > 0) cellState = 'partial';
        else if (isPinnedTo(habit, day)) cellState = 'missed';
        else cellState = 'rest';
        return { day, amount, value, state: cellState };
      }),
    }));
}

// ---- Summary ----------------------------------------------------------------

export interface Summary {
  score: number | null;
  xp: number;
  checkIns: number;
  perfectDays: number;
}

export function summarize(
  state: AppState,
  progress: Progress,
  period: { start: DateKey; end: DateKey },
  today: DateKey,
  area: AreaFilter,
): Summary {
  const rates = habitRates(state, period.start, period.end, today, area);
  const expected = rates.reduce((s, r) => s + r.expected, 0);
  const credit = rates.reduce((s, r) => s + r.rate * r.expected, 0);

  let xp = 0;
  for (const day of range(period.start, minKey(period.end, today))) {
    const d = progress.dailyXp[day];
    if (!d) continue;
    xp += area === 'all' ? d.health + d.work + d.bonus : d[area];
  }

  const series = dailySeries(state, period.start, period.end, today, area);
  return {
    score: expected ? credit / expected : null,
    xp,
    checkIns: rates.reduce((s, r) => s + r.done, 0),
    perfectDays: series.filter((p) => p.due > 0 && p.done === p.due).length,
  };
}

// ---- Weekday rhythm ---------------------------------------------------------

export interface WeekdayPoint {
  weekday: number;
  score: number | null;
  samples: number;
}

export function weekdayProfile(state: AppState, today: DateKey, weeks: number, area: AreaFilter): WeekdayPoint[] {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  const from = addDays(today, -(weeks * 7) + 1);
  for (const day of range(from, today)) {
    for (const h of habitsFor(state, area)) {
      if (isPinnedTo(h, day)) buckets[weekday(day)].push(score(h, amountOn(state, h.id, day)));
    }
  }
  return buckets.map((b, i) => ({ weekday: i, score: mean(b), samples: b.length }));
}

// ---- Correlation ------------------------------------------------------------

/** Pearson correlation; on two binary series this is the phi coefficient. */
export function pearson(xs: number[], ys: number[]): number | null {
  const n = xs.length;
  if (n !== ys.length || n < 2) return null;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    sxy += dx * dy;
    sxx += dx * dx;
    syy += dy * dy;
  }
  if (sxx === 0 || syy === 0) return null;
  return sxy / Math.sqrt(sxx * syy);
}

export const MIN_CORRELATION_SAMPLES = 14;

export interface CorrelationResult {
  habits: Habit[];
  /** r[i][j]; null when there are too few shared days or no variation. */
  r: (number | null)[][];
  n: number[][];
}

export function correlations(state: AppState, today: DateKey, days: number, area: AreaFilter): CorrelationResult {
  const from = addDays(today, -days + 1);
  const window = range(from, today);
  const habits = listedHabitsFor(state, area).filter((h) => window.some((d) => isActiveOn(h, d)));

  const expectedOn = (h: Habit, d: DateKey) => (h.schedule.kind === 'weekly' ? isActiveOn(h, d) : isPinnedTo(h, d));
  const doneOn = (h: Habit, d: DateKey) => (isDone(h, amountOn(state, h.id, d)) ? 1 : 0);

  const r = habits.map(() => habits.map((): number | null => null));
  const n = habits.map(() => habits.map(() => 0));

  habits.forEach((a, i) => {
    habits.forEach((b, j) => {
      if (j < i) return;
      const shared = window.filter((d) => expectedOn(a, d) && expectedOn(b, d));
      n[i][j] = n[j][i] = shared.length;
      if (i === j) {
        r[i][j] = 1;
        return;
      }
      if (shared.length < MIN_CORRELATION_SAMPLES) return;
      const value = pearson(shared.map((d) => doneOn(a, d)), shared.map((d) => doneOn(b, d)));
      r[i][j] = r[j][i] = value;
    });
  });

  return { habits, r, n };
}

// ---- XP by area -------------------------------------------------------------

export function xpSeries(progress: Progress, start: DateKey, end: DateKey) {
  return range(start, end).map((day) => ({ day, ...(progress.dailyXp[day] ?? { health: 0, work: 0, bonus: 0 }) }));
}

// ---- Tidy export ------------------------------------------------------------

export interface TidyRow {
  date: DateKey;
  weekday: string;
  habit: string;
  area: Area;
  schedule: string;
  amount: number;
  target: number;
  unit: string;
  score: number;
  completed: boolean;
  days_since_created: number;
  /** That day's check-in, blank when not logged. */
  mood: number | '';
  energy: number | '';
}

/** One row per habit per day it was due or logged: ready for pandas. */
export function tidyRows(state: AppState, today: DateKey): TidyRow[] {
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const rows: TidyRow[] = [];
  for (const day of range(firstDay(state, today), today)) {
    for (const h of state.habits) {
      if (!isActiveOn(h, day)) continue;
      const amount = amountOn(state, h.id, day);
      if (!isPinnedTo(h, day) && h.schedule.kind !== 'weekly' && amount === 0) continue;
      rows.push({
        date: day,
        weekday: names[weekday(day)],
        habit: h.name,
        area: h.area,
        schedule: h.schedule.kind,
        amount,
        target: h.target,
        unit: h.unit,
        score: Number(score(h, amount).toFixed(3)),
        completed: isDone(h, amount),
        days_since_created: diffDays(h.createdOn, day),
        mood: state.checkins[day]?.mood ?? '',
        energy: state.checkins[day]?.energy ?? '',
      });
    }
  }
  return rows;
}
