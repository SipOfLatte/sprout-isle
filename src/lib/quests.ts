// Weekly quests. Three are picked each Monday from the last four weeks of
// history, so targets stretch you a little without being out of reach.
// Quests are stored once generated; progress and rewards are derived.

import { habitRates, habitsFor, score } from './analytics';
import { addDays, minKey, range, startOfWeek, type DateKey } from './dates';
import { amountOn, isActiveOn, isDone, isPinnedTo } from './engine';
import { mulberry32 } from './sample';
import { AREA_LABEL, type AppState, type Area, type Habit, type Quest } from './types';

export const QUESTS_PER_WEEK = 3;
const HISTORY_WEEKS = 4;
const DEFAULT_RATE = 0.6;
const MAX_STORED_WEEKS = 26;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

function seedFrom(key: string): number {
  let h = 2166136261;
  for (const ch of key) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

function weekDays(weekStart: DateKey) {
  return range(weekStart, addDays(weekStart, 6));
}

/** Days in the week this habit is expected: pinned days, or its weekly quota. */
function expectedInWeek(habit: Habit, weekStart: DateKey): number {
  const s = habit.schedule;
  if (s.kind === 'weekly') return weekDays(weekStart).some((d) => isActiveOn(habit, d)) ? s.times : 0;
  return weekDays(weekStart).filter((d) => isPinnedTo(habit, d)).length;
}

export function generateQuests(state: AppState, weekStart: DateKey): Quest[] {
  const habits = state.habits.filter((h) => weekDays(weekStart).some((d) => isActiveOn(h, d)));
  if (habits.length === 0) return [];

  const rand = mulberry32(seedFrom(weekStart + habits.map((h) => h.id).join('')));
  const histStart = addDays(weekStart, -HISTORY_WEEKS * 7);
  const histEnd = addDays(weekStart, -1);
  const rates = new Map(habitRates(state, histStart, histEnd, histEnd, 'all').map((r) => [r.habit.id, r.rate]));
  const rateOf = (h: Habit) => rates.get(h.id) ?? DEFAULT_RATE;

  const habitQuest = (h: Habit, xp: number): Quest | null => {
    const expected = expectedInWeek(h, weekStart);
    if (expected === 0) return null;
    const target = clamp(Math.ceil(expected * Math.min(1, rateOf(h) + 0.2)), 1, expected);
    return { id: '', kind: 'habit', habitId: h.id, habitName: h.name, target, xp };
  };

  // The focus quest nudges the habit that's been slipping most.
  const byRate = [...habits].sort((a, b) => rateOf(a) - rateOf(b));
  const focus = byRate.map((h) => habitQuest(h, 60)).find(Boolean) ?? null;

  const pool: Quest[] = [];
  const focusHabit = habits.find((h) => h.id === focus?.habitId);
  const others = habits.filter((h) => h.id !== focus?.habitId && (!focusHabit || h.area !== focusHabit.area));
  const other = others.length ? habitQuest(others[Math.floor(rand() * others.length)], 40) : null;
  if (other) pool.push(other);

  const pinnedAny = habits.some((h) => h.schedule.kind !== 'weekly');
  if (pinnedAny) {
    let perfect = 0;
    for (const d of range(histStart, histEnd)) {
      const due = habits.filter((h) => isPinnedTo(h, d));
      if (due.length && due.every((h) => isDone(h, amountOn(state, h.id, d)))) perfect++;
    }
    pool.push({ id: '', kind: 'perfect', target: clamp(Math.round(perfect / HISTORY_WEEKS) + 1, 1, 4), xp: 60 });
  }

  const areas = (['health', 'work'] as Area[]).filter((a) => habits.some((h) => h.area === a));
  if (areas.length) {
    const areaScore = (a: Area) => {
      const r = habitRates(state, histStart, histEnd, histEnd, a);
      const exp = r.reduce((s, x) => s + x.expected, 0);
      return exp ? r.reduce((s, x) => s + x.rate * x.expected, 0) / exp : DEFAULT_RATE;
    };
    const weakest = [...areas].sort((a, b) => areaScore(a) - areaScore(b))[0];
    const target = clamp(Math.round((areaScore(weakest) * 100 + 10) / 5) * 5, 50, 100);
    pool.push({ id: '', kind: 'area', area: weakest, target, xp: 60 });
  }

  const pastDone = habitRates(state, histStart, histEnd, histEnd, 'all').reduce((s, r) => s + r.done, 0);
  const weeklyAvg = pastDone / HISTORY_WEEKS;
  const expectedTotal = habits.reduce((s, h) => s + expectedInWeek(h, weekStart), 0);
  pool.push({
    id: '',
    kind: 'total',
    target: clamp(Math.round(Math.max(weeklyAvg * 1.1, expectedTotal * 0.5)), 3, Math.max(3, expectedTotal)),
    xp: 50,
  });

  if (state.todos.length > 0) pool.push({ id: '', kind: 'todos', target: 2, xp: 40 });

  // Seeded shuffle, then take what's needed after the focus quest.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = [...(focus ? [focus] : []), ...pool].slice(0, QUESTS_PER_WEEK);
  return picked.map((q, i) => ({ ...q, id: `${weekStart}-${i}` }));
}

export interface QuestStatus {
  quest: Quest;
  progress: number;
  target: number;
  doneOn: DateKey | null;
  title: string;
  /** Formatting hint for progress, e.g. "%" for area score quests. */
  unit: '' | '%';
}

export function questTitle(state: AppState, q: Quest): string {
  switch (q.kind) {
    case 'habit': {
      const name = state.habits.find((h) => h.id === q.habitId)?.name ?? q.habitName ?? 'a habit';
      return `${name}: ${q.target} ${q.target === 1 ? 'time' : 'times'}`;
    }
    case 'perfect':
      return `Have ${q.target} perfect ${q.target === 1 ? 'day' : 'days'}`;
    case 'area':
      return `Score ${q.target}% in ${AREA_LABEL[q.area ?? 'health']}`;
    case 'total':
      return `Complete ${q.target} habits`;
    case 'todos':
      return `Finish ${q.target} to-dos`;
  }
}

export function evaluateQuest(state: AppState, q: Quest, weekStart: DateKey, today: DateKey): QuestStatus {
  const days = range(weekStart, minKey(addDays(weekStart, 6), today));
  let progress = 0;
  let doneOn: DateKey | null = null;

  // Area quests measure credit against the whole week's expectation, so they
  // can't be completed early by a single good Monday.
  const areaHabits = q.kind === 'area' ? habitsFor(state, q.area ?? 'health') : [];
  const areaExpected = areaHabits.reduce((s, h) => s + expectedInWeek(h, weekStart), 0);
  let areaCredit = 0;
  const weeklyCounts = new Map<string, number>();

  for (const d of days) {
    switch (q.kind) {
      case 'habit': {
        const h = state.habits.find((x) => x.id === q.habitId);
        if (h && isActiveOn(h, d) && isDone(h, amountOn(state, h.id, d))) progress++;
        break;
      }
      case 'perfect': {
        const due = state.habits.filter((h) => isPinnedTo(h, d));
        if (due.length && due.every((h) => isDone(h, amountOn(state, h.id, d)))) progress++;
        break;
      }
      case 'total':
        progress += state.habits.filter((h) => isActiveOn(h, d) && isDone(h, amountOn(state, h.id, d))).length;
        break;
      case 'todos':
        progress += state.todos.filter((t) => t.doneOn === d).length;
        break;
      case 'area': {
        for (const h of areaHabits) {
          if (h.schedule.kind === 'weekly') {
            if (!isActiveOn(h, d) || !isDone(h, amountOn(state, h.id, d))) continue;
            const n = (weeklyCounts.get(h.id) ?? 0) + 1;
            weeklyCounts.set(h.id, n);
            if (n <= h.schedule.times) areaCredit++;
          } else if (isPinnedTo(h, d)) {
            areaCredit += score(h, amountOn(state, h.id, d));
          }
        }
        progress = areaExpected ? Math.floor((areaCredit / areaExpected) * 100) : 0;
        break;
      }
    }
    if (!doneOn && progress >= q.target) doneOn = d;
  }

  return { quest: q, progress, target: q.target, doneOn, title: questTitle(state, q), unit: q.kind === 'area' ? '%' : '' };
}

/** Quest reward XP keyed by the day each quest was completed. */
export function questRewards(state: AppState, today: DateKey): Record<DateKey, number[]> {
  const out: Record<DateKey, number[]> = {};
  for (const [weekStart, quests] of Object.entries(state.quests)) {
    if (weekStart > today) continue;
    for (const q of quests) {
      const { doneOn } = evaluateQuest(state, q, weekStart, today);
      if (doneOn) (out[doneOn] ??= []).push(q.xp);
    }
  }
  return out;
}

/** Returns quests for this week if they still need generating, else null. */
export function questsToGenerate(state: AppState, today: DateKey): { weekStart: DateKey; quests: Quest[] } | null {
  const weekStart = startOfWeek(today);
  if (state.quests[weekStart]?.length) return null;
  const quests = generateQuests(state, weekStart);
  return quests.length ? { weekStart, quests } : null;
}

export function pruneQuests(quests: AppState['quests']): AppState['quests'] {
  const keys = Object.keys(quests).sort().slice(-MAX_STORED_WEEKS);
  return Object.fromEntries(keys.map((k) => [k, quests[k]]));
}
