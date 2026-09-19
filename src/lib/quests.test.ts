import { describe, expect, it } from 'vitest';
import { addDays } from './dates';
import { computeProgress } from './engine';
import { evaluateQuest, generateQuests, questRewards } from './quests';
import { sampleState } from './sample';
import type { AppState, Habit, Quest } from './types';

const MONDAY = '2026-09-14';
const T = '2026-09-17';

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Walk',
    area: 'health',
    schedule: { kind: 'daily' },
    target: 1,
    unit: '',
    difficulty: 'easy',
    createdOn: '2026-08-01',
    archivedOn: null,
    ...overrides,
  };
}

const state = (habits: Habit[], logs: AppState['logs'] = {}, quests: AppState['quests'] = {}): AppState => ({
  version: 1, worldName: 'x', habits, todos: [], rewards: [], redemptions: [], logs, quests, bosses: {}, companion: null, purchases: [], placements: {}, checkins: {}, trash: { habits: [], todos: [] }, isSample: false, updatedAt: 0,
});

describe('generateQuests', () => {
  it('is deterministic and picks three distinct quests', () => {
    const s = sampleState(T);
    const a = generateQuests(s, MONDAY);
    const b = generateQuests(s, MONDAY);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((q) => q.id)).size).toBe(3);
  });

  it('leads with a focus quest on the weakest habit', () => {
    const strong = habit({ id: 'strong', name: 'Strong' });
    const weak = habit({ id: 'weak', name: 'Weak', area: 'work' });
    const logs = Object.fromEntries(
      Array.from({ length: 28 }, (_, i) => [addDays(MONDAY, -28 + i), { strong: 1, ...(i % 4 === 0 ? { weak: 1 } : {}) }]),
    );
    const [focus] = generateQuests(state([strong, weak], logs), MONDAY);
    expect(focus).toMatchObject({ kind: 'habit', habitId: 'weak' });
    expect(focus.target).toBeLessThanOrEqual(7);
  });

  it('returns nothing without habits', () => {
    expect(generateQuests(state([]), MONDAY)).toEqual([]);
  });
});

describe('evaluateQuest', () => {
  const q: Quest = { id: `${MONDAY}-0`, kind: 'habit', habitId: 'h1', target: 2, xp: 60 };

  it('records the day the target was reached', () => {
    const s = state([habit()], { [MONDAY]: { h1: 1 }, [addDays(MONDAY, 2)]: { h1: 1 } });
    expect(evaluateQuest(s, q, MONDAY, T)).toMatchObject({ progress: 2, doneOn: addDays(MONDAY, 2) });
  });

  it('measures area quests against the whole week', () => {
    const area: Quest = { id: 'a', kind: 'area', area: 'health', target: 50, xp: 60 };
    const s = state([habit()], { [MONDAY]: { h1: 1 }, [addDays(MONDAY, 1)]: { h1: 1 }, [addDays(MONDAY, 2)]: { h1: 1 } });
    expect(evaluateQuest(s, area, MONDAY, T)).toMatchObject({ progress: 42, doneOn: null }); // 3 of 7
  });

  it('feeds quest XP into progress', () => {
    const s = state([habit()], { [MONDAY]: { h1: 1 }, [addDays(MONDAY, 1)]: { h1: 1 } }, { [MONDAY]: [q] });
    const p = computeProgress(s, T, { questXp: questRewards(s, T) });
    expect(p.questsDone).toBe(1);
    expect(p.dailyXp[addDays(MONDAY, 1)].bonus).toBeGreaterThanOrEqual(60);
  });
});
