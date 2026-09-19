import { describe, expect, it } from 'vitest';
import { correlations, dailySeries, habitRates, pearson, periodFor, rollingMean, shiftPeriod, tidyRows } from './analytics';
import { toCsv } from './csv';
import { addDays, range } from './dates';
import { sampleState } from './sample';
import type { AppState, Habit } from './types';

const T = '2026-09-17';

const base = (h: Partial<Habit>): Habit => ({
  id: 'a',
  name: 'A',
  area: 'health',
  schedule: { kind: 'daily' },
  target: 1,
  unit: '',
  difficulty: 'easy',
  createdOn: '2026-01-01',
  archivedOn: null,
  ...h,
});

const state = (habits: Habit[], logs: AppState['logs']): AppState => ({
  version: 1, worldName: 'x', habits, todos: [], rewards: [], redemptions: [], logs, quests: {}, bosses: {}, companion: null, purchases: [], placements: {}, checkins: {}, trash: { habits: [], todos: [] }, isSample: false, updatedAt: 0,
});

describe('periods', () => {
  it('builds Monday-start weeks and whole months', () => {
    expect(periodFor('week', T)).toMatchObject({ start: '2026-09-14', end: '2026-09-20' });
    expect(periodFor('month', T)).toMatchObject({ start: '2026-09-01', end: '2026-09-30' });
    expect(shiftPeriod(periodFor('month', '2026-03-10'), -1)).toMatchObject({ start: '2026-02-01', end: '2026-02-28' });
  });
});

describe('statistics', () => {
  it('pearson matches known values and rejects constant series', () => {
    expect(pearson([1, 2, 3], [2, 4, 6])).toBeCloseTo(1);
    expect(pearson([1, 0, 1, 0], [0, 1, 0, 1])).toBeCloseTo(-1);
    expect(pearson([1, 1, 1], [0, 1, 0])).toBeNull();
  });

  it('rolling mean ignores gaps', () => {
    expect(rollingMean([1, null, 0, 1], 3)).toEqual([1, null, 0.5, 0.5]);
  });
});

describe('completion', () => {
  it('gives partial credit for amounts', () => {
    const s = state([base({ target: 8 })], { [T]: { a: 6 } });
    expect(dailySeries(s, T, T, T, 'all')[0]).toMatchObject({ score: 0.75, due: 1, done: 0 });
  });

  it('scales weekly quotas to the part of the week in view', () => {
    const h = base({ schedule: { kind: 'weekly', times: 7 } });
    const s = state([h], { '2026-09-01': { a: 1 } }); // Tue; window Tue–Wed of that week
    const [r] = habitRates(s, '2026-09-01', '2026-09-02', T, 'all');
    expect(r).toMatchObject({ expected: 2, done: 1, rate: 0.5 });
  });

  it('finds perfectly co-occurring habits', () => {
    const days = range(addDays(T, -29), T);
    const logs: AppState['logs'] = Object.fromEntries(days.map((d, i): [string, Record<string, number>] => [d, i % 2 ? { a: 1, b: 1 } : {}]));
    const s = state([base({}), base({ id: 'b', name: 'B' })], logs);
    expect(correlations(s, T, 30, 'all').r[0][1]).toBeCloseTo(1);
  });
});

describe('export', () => {
  it('produces tidy rows and defuses spreadsheet formulas', () => {
    const rows = tidyRows(sampleState(T), T);
    expect(rows.length).toBeGreaterThan(300);
    expect(rows.some((r) => typeof r.mood === 'number')).toBe(true);
    expect(Object.keys(rows[0])).toEqual(expect.arrayContaining(['mood', 'energy']));
    expect(toCsv([{ habit: '=HYPERLINK("x")' }])).toBe('habit\n"\'=HYPERLINK(""x"")"');
  });
});
