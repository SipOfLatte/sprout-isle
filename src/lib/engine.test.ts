import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { computeProgress, habitStreak, levelInfo, PERFECT_DAY_BONUS, COMEBACK_BONUS } from './engine';
import type { AppState, Habit } from './types';

const T = '2026-09-17'; // a Thursday

function state(habits: Habit[], logs: AppState['logs'] = {}): AppState {
  return { version: 1, worldName: 'Test', habits, todos: [], rewards: [], redemptions: [], logs, quests: {}, isSample: false, updatedAt: 0 };
}

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Walk',
    area: 'health',
    schedule: { kind: 'daily' },
    target: 1,
    unit: '',
    difficulty: 'easy',
    createdOn: addDays(T, -20),
    archivedOn: null,
    ...overrides,
  };
}

const logDays = (id: string, days: string[], amount = 1) =>
  Object.fromEntries(days.map((d) => [d, { [id]: amount }]));

describe('levels', () => {
  it('follows the 0 / 100 / 300 / 600 curve', () => {
    expect(levelInfo(0).level).toBe(1);
    expect(levelInfo(99).level).toBe(1);
    expect(levelInfo(100).level).toBe(2);
    expect(levelInfo(300)).toMatchObject({ level: 3, intoLevel: 0, levelSpan: 300 });
  });
});

describe('computeProgress', () => {
  it('awards XP, a perfect-day bonus and coins', () => {
    const p = computeProgress(state([habit()], logDays('h1', [T])), T);
    expect(p.areaXp.health).toBe(10);
    expect(p.totalXp).toBe(10 + PERFECT_DAY_BONUS);
    expect(p.coins).toBe(Math.floor((10 + PERFECT_DAY_BONUS) / 5));
  });

  it('does not count a partial amount as done', () => {
    const p = computeProgress(state([habit({ target: 8 })], logDays('h1', [T], 5)), T);
    expect(p.checkIns).toBe(0);
    expect(p.streak).toBe(1); // showing up still keeps the streak
  });

  it('keeps the streak alive while today is still unticked', () => {
    const days = [-3, -2, -1].map((n) => addDays(T, n));
    expect(computeProgress(state([habit()], logDays('h1', days)), T).streak).toBe(3);
  });

  it('spends an earned freeze on a missed day instead of resetting', () => {
    const run = Array.from({ length: 7 }, (_, i) => addDays(T, -9 + i)); // T-9 … T-3
    const p = computeProgress(state([habit()], logDays('h1', [...run, addDays(T, -1)])), T);
    expect(p.freezeDays).toEqual([addDays(T, -2)]);
    expect(p.streak).toBe(8);
  });

  it('gives a comeback bonus after a gap', () => {
    const p = computeProgress(state([habit()], logDays('h1', [addDays(T, -10), T])), T);
    expect(p.comebacks).toBe(1);
    expect(p.dailyXp[T].bonus).toBe(PERFECT_DAY_BONUS + COMEBACK_BONUS);
  });

  it('caps weekly habit XP at its quota', () => {
    const h = habit({ schedule: { kind: 'weekly', times: 2 } });
    const week = ['2026-09-14', '2026-09-15', '2026-09-16'];
    expect(computeProgress(state([h], logDays('h1', week)), T).checkIns).toBe(2);
  });
});

describe('habitStreak', () => {
  it('skips days the habit is not scheduled', () => {
    const h = habit({ schedule: { kind: 'weekdays', days: [0, 2] } }); // Mon, Wed
    const logs = logDays('h1', ['2026-09-07', '2026-09-09', '2026-09-14', '2026-09-16']);
    expect(habitStreak(state([h], logs), h, T)).toBe(4);
  });

  it('counts completed weeks for weekly habits', () => {
    const h = habit({ schedule: { kind: 'weekly', times: 1 } });
    const logs = logDays('h1', ['2026-09-02', '2026-09-08']);
    expect(habitStreak(state([h], logs), h, T)).toBe(2); // this week not done yet, doesn't break
  });
});
