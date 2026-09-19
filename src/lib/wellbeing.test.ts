import { describe, expect, it } from 'vitest';
import { addDays, range } from './dates';
import { computeProgress, CHECKIN_BONUS } from './engine';
import { sampleState } from './sample';
import { linearFit, tCritical95, welchInterval } from './stats';
import type { AppState, Habit } from './types';
import { completionVsRating, habitEffects, wellbeingSeries, wellbeingSummary } from './wellbeing';

const T = '2026-09-17';

const habit = (overrides: Partial<Habit> = {}): Habit => ({
  id: 'walk', name: 'Walk', area: 'health', schedule: { kind: 'daily' }, target: 1, unit: '',
  difficulty: 'easy', createdOn: '2026-01-01', archivedOn: null, ...overrides,
});

const state = (extra: Partial<AppState>): AppState => ({
  version: 1, worldName: 'x', habits: [], todos: [], rewards: [], redemptions: [], logs: {}, quests: {}, bosses: {},
  companion: null, purchases: [], placements: {}, checkins: {}, trash: { habits: [], todos: [] }, isSample: false, updatedAt: 0, ...extra,
});

describe('stats', () => {
  it('matches known t critical values', () => {
    expect(tCritical95(1)).toBeCloseTo(12.706, 3);
    expect(tCritical95(10)).toBeCloseTo(2.228, 3);
    expect(tCritical95(60)).toBeCloseTo(2.0003, 3);
    expect(tCritical95(1000)).toBeCloseTo(1.9623, 3);
  });

  it('matches scipy.stats.ttest_ind(equal_var=False) confidence intervals', () => {
    // Reference: diff 2.16667, CI [1.15557, 3.17777], df 9.93469
    const r = welchInterval([5, 6, 7, 6, 5, 6], [3, 4, 3, 5, 4, 3])!;
    expect(r.diff).toBeCloseTo(2.16667, 4);
    expect(r.df).toBeCloseTo(9.93469, 4);
    expect(r.lo).toBeCloseTo(1.15557, 2);
    expect(r.hi).toBeCloseTo(3.17777, 2);
  });

  it('fits a line exactly through collinear points', () => {
    expect(linearFit([0, 1, 2, 3], [1, 3, 5, 7])).toMatchObject({ slope: 2, intercept: 1, r: 1, n: 4 });
    expect(linearFit([1, 1, 1], [1, 2, 3])).toBeNull();
  });
});

describe('wellbeing', () => {
  it('rewards a check-in and counts it as showing up', () => {
    const p = computeProgress(state({ checkins: { [T]: { mood: 4, energy: null } } }), T);
    expect(p.totalXp).toBe(CHECKIN_BONUS);
    expect(p.streak).toBe(1);
  });

  it('summarises and smooths ratings', () => {
    const checkins = Object.fromEntries(range(addDays(T, -6), T).map((d, i) => [d, { mood: i % 2 ? 4 : 2, energy: 3 }]));
    const s = state({ checkins });
    expect(wellbeingSummary(s, addDays(T, -6), T, T)).toMatchObject({ mood: 20 / 7, energy: 3, checkedIn: 7, days: 7 });
    expect(wellbeingSeries(s, T, T, T)[0].moodAvg).toBeCloseTo(20 / 7);
  });

  it('finds a same-day lift and ignores habits with too little data', () => {
    const days = range(addDays(T, -29), T);
    const logs = Object.fromEntries(days.filter((_, i) => i % 2 === 0).map((d) => [d, { walk: 1 }]));
    const checkins = Object.fromEntries(days.map((d, i) => [d, { mood: i % 2 === 0 ? 4 + (i % 4 === 0 ? 1 : 0) : 2, energy: 3 }]));
    const s = state({ habits: [habit(), habit({ id: 'new', name: 'New', createdOn: addDays(T, -2) })], logs, checkins });
    const [walk, fresh] = habitEffects(s, T, 'mood', 'all', 30);
    expect(walk.sameDay!.diff).toBeGreaterThan(1.5);
    expect(walk.sameDay!.lo).toBeGreaterThan(0);
    expect(fresh.sameDay).toBeNull();
  });

  it('recovers the planted patterns in the sample data', () => {
    const s = sampleState(T);
    const moodEffects = habitEffects(s, T, 'mood', 'all');
    const walk = moodEffects.find((e) => e.habit.name.startsWith('Walk'))!;
    expect(walk.sameDay!.diff).toBeGreaterThan(0.2);
    const sleep = habitEffects(s, T, 'energy', 'all').find((e) => e.habit.name.startsWith('In bed'))!;
    expect(sleep.nextDay!.diff).toBeGreaterThan(sleep.sameDay!.diff);
    expect(completionVsRating(s, T, 'mood', 'all').fit!.r).toBeGreaterThan(0.2);
  });
});
