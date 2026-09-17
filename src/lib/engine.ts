// The game rules. Everything here is derived from the raw logs, so progress is
// never stored and can't drift: edit a past day and XP, streaks and the world
// all recompute consistently.

import { addDays, diffDays, minKey, range, startOfWeek, weekday, type DateKey } from './dates';
import type { AppState, Area, Habit } from './types';
import { XP_BY_DIFFICULTY } from './types';

export const PERFECT_DAY_BONUS = 10;
export const COMEBACK_BONUS = 25;
export const COMEBACK_GAP_DAYS = 3;
export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;
export const XP_PER_COIN = 5;
/** A small thank-you for checking in, which also counts as showing up. */
export const CHECKIN_BONUS = 5;

export function isActiveOn(habit: Habit, day: DateKey): boolean {
  return habit.createdOn <= day && (habit.archivedOn === null || day < habit.archivedOn);
}

/** Habits pinned to a day (daily or chosen weekdays). Weekly habits float. */
export function isPinnedTo(habit: Habit, day: DateKey): boolean {
  if (!isActiveOn(habit, day)) return false;
  const s = habit.schedule;
  if (s.kind === 'daily') return true;
  if (s.kind === 'weekdays') return s.days.includes(weekday(day));
  return false;
}

export function amountOn(state: AppState, habitId: string, day: DateKey): number {
  return state.logs[day]?.[habitId] ?? 0;
}

export function isDone(habit: Habit, amount: number): boolean {
  return amount >= habit.target;
}

/** Completions of a habit in its ISO week, up to and including `day`. */
export function weekCompletions(state: AppState, habit: Habit, day: DateKey): number {
  let n = 0;
  for (const d of range(startOfWeek(day), day)) {
    if (isDone(habit, amountOn(state, habit.id, d))) n++;
  }
  return n;
}

/** Whether a habit belongs on a given day's list. */
export function isDueOn(habit: Habit, day: DateKey): boolean {
  if (!isActiveOn(habit, day)) return false;
  return habit.schedule.kind === 'weekly' ? true : isPinnedTo(habit, day);
}

/** Whether a habit counts toward a day's "X of Y done". A weekly habit counts
 *  on days it was done, and on other days only while its quota is still open. */
export function countsTowardDay(state: AppState, habit: Habit, day: DateKey): boolean {
  if (!isActiveOn(habit, day)) return false;
  const s = habit.schedule;
  if (s.kind !== 'weekly') return isPinnedTo(habit, day);
  const doneToday = isDone(habit, amountOn(state, habit.id, day));
  const earlier = weekCompletions(state, habit, day) - (doneToday ? 1 : 0);
  return doneToday || earlier < s.times;
}

export function dayTally(state: AppState, day: DateKey): { due: number; done: number } {
  let due = 0;
  let done = 0;
  for (const h of state.habits) {
    if (!countsTowardDay(state, h, day)) continue;
    due++;
    if (isDone(h, amountOn(state, h.id, day))) done++;
  }
  return { due, done };
}

export interface DayXp {
  health: number;
  work: number;
  bonus: number;
}

export interface Progress {
  totalXp: number;
  areaXp: Record<Area, number>;
  dailyXp: Record<DateKey, DayXp>;
  coins: number;
  coinsSpent: number;
  streak: number;
  bestStreak: number;
  freezes: number;
  freezeDays: DateKey[];
  perfectDays: number;
  comebacks: number;
  checkIns: number;
  todosDone: number;
  questsDone: number;
  bossesDefeated: number;
  /** Days with a mood or energy check-in. */
  checkInsLogged: number;
}

/** Bonus XP earned from quests and bosses, keyed by the day it was earned. */
export interface Extras {
  questXp?: Record<DateKey, number[]>;
  bossXp?: Record<DateKey, number[]>;
}

export function firstDay(state: AppState, today: DateKey): DateKey {
  const keys = [
    today,
    ...state.habits.map((h) => h.createdOn),
    ...state.todos.map((t) => t.doneOn ?? t.createdOn),
    ...Object.keys(state.logs),
    ...Object.keys(state.checkins),
  ];
  return minKey(...keys);
}

export function computeProgress(state: AppState, today: DateKey, extras: Extras = {}): Progress {
  const questXp = extras.questXp ?? {};
  const bossXp = extras.bossXp ?? {};
  const p: Progress = {
    totalXp: 0,
    areaXp: { health: 0, work: 0 },
    dailyXp: {},
    coins: 0,
    coinsSpent: 0,
    streak: 0,
    bestStreak: 0,
    freezes: 0,
    freezeDays: [],
    perfectDays: 0,
    comebacks: 0,
    checkIns: 0,
    todosDone: 0,
    questsDone: 0,
    bossesDefeated: 0,
    checkInsLogged: 0,
  };

  const todosByDay = new Map<DateKey, typeof state.todos>();
  for (const t of state.todos) {
    if (!t.doneOn) continue;
    const list = todosByDay.get(t.doneOn) ?? [];
    list.push(t);
    todosByDay.set(t.doneOn, list);
  }

  let lastActive: DateKey | null = null;

  for (const day of range(firstDay(state, today), today)) {
    const xp: DayXp = { health: 0, work: 0, bonus: 0 };
    let active = false;
    let pinned = 0;
    let pinnedDone = 0;

    for (const habit of state.habits) {
      const amount = amountOn(state, habit.id, day);
      if (amount > 0) active = true;
      const done = isDone(habit, amount);
      if (isPinnedTo(habit, day)) {
        pinned++;
        if (done) pinnedDone++;
      }
      if (!done || !isActiveOn(habit, day)) continue;

      const s = habit.schedule;
      const earns =
        s.kind === 'weekly' ? weekCompletions(state, habit, day) <= s.times : isPinnedTo(habit, day);
      if (earns) {
        xp[habit.area] += XP_BY_DIFFICULTY[habit.difficulty];
        p.checkIns++;
      }
    }

    for (const t of todosByDay.get(day) ?? []) {
      xp[t.area] += XP_BY_DIFFICULTY[t.difficulty];
      p.todosDone++;
      active = true;
    }

    const checkIn = state.checkins[day];
    if (checkIn && (checkIn.mood !== null || checkIn.energy !== null)) {
      xp.bonus += CHECKIN_BONUS;
      p.checkInsLogged++;
      active = true;
    }

    for (const reward of questXp[day] ?? []) {
      xp.bonus += reward;
      p.questsDone++;
    }

    for (const reward of bossXp[day] ?? []) {
      xp.bonus += reward;
      p.bossesDefeated++;
    }

    if (pinned > 0 && pinnedDone === pinned) {
      xp.bonus += PERFECT_DAY_BONUS;
      p.perfectDays++;
    }

    if (active) {
      if (lastActive !== null && diffDays(lastActive, day) >= COMEBACK_GAP_DAYS) {
        xp.bonus += COMEBACK_BONUS;
        p.comebacks++;
      }
      p.streak++;
      if (p.streak % FREEZE_EVERY === 0) p.freezes = Math.min(MAX_FREEZES, p.freezes + 1);
      lastActive = day;
    } else if (day !== today && p.streak > 0) {
      // Missing a day is gentle: a saved freeze covers it before the streak resets.
      if (p.freezes > 0) {
        p.freezes--;
        p.freezeDays.push(day);
      } else {
        p.streak = 0;
      }
    }
    p.bestStreak = Math.max(p.bestStreak, p.streak);

    const dayTotal = xp.health + xp.work + xp.bonus;
    if (dayTotal > 0) p.dailyXp[day] = xp;
    p.areaXp.health += xp.health;
    p.areaXp.work += xp.work;
    p.totalXp += dayTotal;
  }

  p.coinsSpent = state.redemptions.reduce((s, r) => s + r.cost, 0) + state.purchases.reduce((s, r) => s + r.cost, 0);
  p.coins = Math.floor(p.totalXp / XP_PER_COIN) - p.coinsSpent;
  return p;
}

// ---- Levels -----------------------------------------------------------------

/** XP needed to reach a level: base × L × (L − 1), i.e. 0, 100, 300, 600, 1000 … */
export function xpForLevel(level: number, base = 50): number {
  return base * level * (level - 1);
}

export interface LevelInfo {
  level: number;
  intoLevel: number;
  levelSpan: number;
  fraction: number;
}

export function levelInfo(xp: number, base = 50): LevelInfo {
  let level = 1;
  while (xpForLevel(level + 1, base) <= xp) level++;
  const start = xpForLevel(level, base);
  const span = xpForLevel(level + 1, base) - start;
  return { level, intoLevel: xp - start, levelSpan: span, fraction: (xp - start) / span };
}

/** Area levels grow the world and use a gentler curve. */
export const AREA_LEVEL_BASE = 30;

// ---- Per-habit streaks ------------------------------------------------------

/** Consecutive completed scheduled days (or weeks, for weekly habits). Today
 *  only counts once it's done, so an unticked morning never shows a broken streak. */
export function habitStreak(state: AppState, habit: Habit, today: DateKey): number {
  const s = habit.schedule;
  if (s.kind === 'weekly') {
    let weekStart = startOfWeek(today);
    let n = 0;
    let isCurrent = true;
    while (addDays(weekStart, 6) >= habit.createdOn) {
      const end = isCurrent ? today : addDays(weekStart, 6);
      const count = weekCompletions(state, habit, end);
      if (count >= s.times) n++;
      else if (!isCurrent) break;
      isCurrent = false;
      weekStart = addDays(weekStart, -7);
    }
    return n;
  }

  let n = 0;
  for (let d = today; d >= habit.createdOn; d = addDays(d, -1)) {
    if (!isPinnedTo(habit, d)) continue;
    if (isDone(habit, amountOn(state, habit.id, d))) n++;
    else if (d !== today) break;
  }
  return n;
}

export function scheduleLabel(habit: Habit): string {
  const s = habit.schedule;
  if (s.kind === 'daily') return 'Every day';
  if (s.kind === 'weekly') return `${s.times}× a week`;
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  if (s.days.length === 5 && [0, 1, 2, 3, 4].every((d) => s.days.includes(d))) return 'Weekdays';
  if (s.days.length === 2 && s.days.includes(5) && s.days.includes(6)) return 'Weekends';
  return [...s.days].sort().map((d) => names[d]).join(', ');
}
