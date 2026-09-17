import { describe, expect, it } from 'vitest';
import { BOSS_XP, bossOutcomes, dayDamage, evaluateBoss, generateBoss, PERFECT_DAY_DAMAGE, REPEAT_BOSS_XP } from './bosses';
import { addDays } from './dates';
import { bond, petMood, stageFor } from './pets';
import { sampleState } from './sample';
import type { AppState, Habit } from './types';

const MONDAY = '2026-09-14';
const T = '2026-09-17';

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1', name: 'Gym', area: 'health', schedule: { kind: 'daily' }, target: 1, unit: '',
    difficulty: 'hard', createdOn: '2026-08-01', archivedOn: null, ...overrides,
  };
}

const state = (habits: Habit[], logs: AppState['logs'] = {}, extra: Partial<AppState> = {}): AppState => ({
  version: 1, worldName: 'x', habits, todos: [], rewards: [], redemptions: [], logs, quests: {}, bosses: {},
  companion: null, purchases: [], placements: {}, checkins: {}, isSample: false, updatedAt: 0, ...extra,
});

describe('bosses', () => {
  it('deals damage by effort, plus a perfect-day bonus', () => {
    const s = state([habit()], { [T]: { h1: 1 } });
    expect(dayDamage(s, T)).toBe(3 + PERFECT_DAY_DAMAGE);
  });

  it('sizes HP from recent weeks and never picks last week’s boss', () => {
    const s = sampleState(T);
    const boss = generateBoss(s, MONDAY)!;
    expect(boss.hp).toBeGreaterThanOrEqual(8);
    const next = generateBoss({ ...s, bosses: { [MONDAY]: boss } }, addDays(MONDAY, 7))!;
    expect(next.kind).not.toBe(boss.kind);
  });

  it('records the day the boss falls', () => {
    const logs = { [MONDAY]: { h1: 1 }, [addDays(MONDAY, 1)]: { h1: 1 } };
    const s = state([habit()], logs);
    expect(evaluateBoss(s, MONDAY, { kind: 'slime', hp: 8 }, T)).toMatchObject({ damage: 10, defeatedOn: addDays(MONDAY, 1) });
  });

  it('drops loot on the first win against a kind and XP on repeats', () => {
    const prev = addDays(MONDAY, -7);
    const logs = { [prev]: { h1: 1 }, [MONDAY]: { h1: 1 } };
    const s = state([habit()], logs, { bosses: { [prev]: { kind: 'slime', hp: 5 }, [MONDAY]: { kind: 'slime', hp: 5 } } });
    const out = bossOutcomes(s, T);
    expect(out.loot).toEqual(['slime-plush']);
    expect(out.xpByDay[prev]).toEqual([BOSS_XP]);
    expect(out.xpByDay[MONDAY]).toEqual([BOSS_XP + REPEAT_BOSS_XP]);
  });
});

describe('pets', () => {
  it('grows through stages with completions', () => {
    expect(stageFor(0)).toEqual({ stage: 0, next: 20 });
    expect(stageFor(20).stage).toBe(1);
    expect(stageFor(500)).toEqual({ stage: 2, next: null });
    const s = state([habit()], { [MONDAY]: { h1: 1 }, [T]: { h1: 1 } });
    expect(bond(s, { species: 'fox', name: 'M', adoptedOn: MONDAY }, T)).toBe(2);
  });

  it('greets a comeback warmly instead of dwelling on the gap', () => {
    const away = state([habit()], { [addDays(T, -5)]: { h1: 1 } });
    expect(petMood(away, T)).toBe('missing');
    const back = state([habit()], { [addDays(T, -5)]: { h1: 1 }, [T]: { h1: 1 } });
    expect(petMood(back, T)).toBe('overjoyed');
    expect(petMood(state([habit()], { [addDays(T, -1)]: { h1: 1 } }), T)).toBe('waiting');
  });
});
