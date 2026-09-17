// Mood and energy analysis: trends, how each habit lines up with better or
// worse days (same day and the day after), and completion vs mood.
// All of this is observational. The UI says so, and shows sample sizes.

import { dailySeries, habitsFor, rollingMean, type AreaFilter } from './analytics';
import { addDays, minKey, range, weekday, type DateKey } from './dates';
import { amountOn, isActiveOn, isDone, isPinnedTo } from './engine';
import { linearFit, mean, welchInterval, type LinearFit, type MeanDifference } from './stats';
import type { AppState, Habit } from './types';

export type Measure = 'mood' | 'energy';

export const MOOD_LABELS = ['Rough', 'Low', 'Okay', 'Good', 'Great'];
export const ENERGY_LABELS = ['Drained', 'Tired', 'Steady', 'Lively', 'Energised'];
export const LOOKBACK_DAYS = 90;
/** Minimum days in each group (done / not done) before showing an effect. */
export const MIN_GROUP = 5;

export function ratingOn(state: AppState, day: DateKey, measure: Measure): number | null {
  return state.checkins[day]?.[measure] ?? null;
}

export interface WellbeingPoint {
  day: DateKey;
  mood: number | null;
  energy: number | null;
  moodAvg: number | null;
  energyAvg: number | null;
}

/** Daily ratings with 7-day trailing means (the window reaches back before `start`). */
export function wellbeingSeries(state: AppState, start: DateKey, end: DateKey, today: DateKey): WellbeingPoint[] {
  const days = range(addDays(start, -6), end);
  const mood = days.map((d) => (d > today ? null : ratingOn(state, d, 'mood')));
  const energy = days.map((d) => (d > today ? null : ratingOn(state, d, 'energy')));
  // Rolling mean over the last 7 calendar days, including days without a rating.
  const trailing = (vals: (number | null)[]) =>
    vals.map((_, i) => (days[i] > today ? null : mean(vals.slice(Math.max(0, i - 6), i + 1).filter((v): v is number => v !== null))));
  const moodAvg = trailing(mood);
  const energyAvg = trailing(energy);
  return days.slice(6).map((day, i) => ({ day, mood: mood[i + 6], energy: energy[i + 6], moodAvg: moodAvg[i + 6], energyAvg: energyAvg[i + 6] }));
}

export interface WellbeingSummary {
  mood: number | null;
  energy: number | null;
  checkedIn: number;
  days: number;
}

export function wellbeingSummary(state: AppState, start: DateKey, end: DateKey, today: DateKey): WellbeingSummary {
  const last = minKey(end, today);
  const days = last < start ? [] : range(start, last);
  const moods = days.map((d) => ratingOn(state, d, 'mood')).filter((v): v is number => v !== null);
  const energies = days.map((d) => ratingOn(state, d, 'energy')).filter((v): v is number => v !== null);
  const checkedIn = days.filter((d) => state.checkins[d]).length;
  return { mood: mean(moods), energy: mean(energies), checkedIn, days: days.length };
}

export interface HabitEffect {
  habit: Habit;
  /** Mean rating on days the habit was done minus days it was due but not done. */
  sameDay: MeanDifference | null;
  /** Same comparison, using the next day's rating. */
  nextDay: MeanDifference | null;
}

/** Days a habit could have been done: pinned days, or any active day for weekly habits. */
function expectedOn(habit: Habit, day: DateKey) {
  return habit.schedule.kind === 'weekly' ? isActiveOn(habit, day) : isPinnedTo(habit, day);
}

function effect(state: AppState, habit: Habit, days: DateKey[], measure: Measure, lag: 0 | 1): MeanDifference | null {
  const done: number[] = [];
  const notDone: number[] = [];
  for (const d of days) {
    if (!expectedOn(habit, d)) continue;
    const rating = ratingOn(state, addDays(d, lag), measure);
    if (rating === null) continue;
    (isDone(habit, amountOn(state, habit.id, d)) ? done : notDone).push(rating);
  }
  if (done.length < MIN_GROUP || notDone.length < MIN_GROUP) return null;
  return welchInterval(done, notDone);
}

export function habitEffects(state: AppState, today: DateKey, measure: Measure, area: AreaFilter, lookback = LOOKBACK_DAYS): HabitEffect[] {
  const days = range(addDays(today, -lookback + 1), today);
  // Next-day effects can't use today, whose "tomorrow" hasn't happened.
  const lagDays = days.slice(0, -1);
  return habitsFor(state, area)
    .filter((h) => days.some((d) => isActiveOn(h, d)))
    .map((habit) => ({
      habit,
      sameDay: effect(state, habit, days, measure, 0),
      nextDay: effect(state, habit, lagDays, measure, 1),
    }))
    .sort((a, b) => (b.sameDay?.diff ?? -Infinity) - (a.sameDay?.diff ?? -Infinity));
}

export interface ScatterPoint {
  day: DateKey;
  score: number;
  rating: number;
}

export function completionVsRating(
  state: AppState,
  today: DateKey,
  measure: Measure,
  area: AreaFilter,
  lookback = LOOKBACK_DAYS,
): { points: ScatterPoint[]; fit: LinearFit | null } {
  const start = addDays(today, -lookback + 1);
  const points = dailySeries(state, start, today, today, area)
    .map((p) => ({ day: p.day, score: p.score, rating: ratingOn(state, p.day, measure) }))
    .filter((p): p is ScatterPoint => p.score !== null && p.rating !== null);
  return { points, fit: linearFit(points.map((p) => p.score), points.map((p) => p.rating)) };
}

export function weekdayRatings(state: AppState, today: DateKey, measure: Measure, weeks = 12) {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const d of range(addDays(today, -weeks * 7 + 1), today)) {
    const r = ratingOn(state, d, measure);
    if (r !== null) buckets[weekday(d)].push(r);
  }
  return buckets.map((b, i) => ({ weekday: i, mean: mean(b), n: b.length }));
}

export { rollingMean };
