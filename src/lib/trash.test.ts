import { describe, expect, it } from 'vitest';
import { computeProgress, dayTally } from './engine';
import { parseState } from './schema';
import { emptyState } from './storage';
import { daysLeft, liveHabits, pruneTrash, purgeTrash, restoreFromTrash, resumeHabit, trashHabits, trashTodo } from './trash';
import type { AppState, Habit, Todo } from './types';

const T = '2026-09-18';

const habit = (id: string, archivedOn: string | null = null): Habit => ({
  id, name: id, area: 'health', schedule: { kind: 'daily' }, target: 1, unit: '', difficulty: 'easy', createdOn: '2026-09-01', archivedOn, deletedOn: null, breaks: [],
});
const todo = (id: string, doneOn: string | null = null): Todo => ({ id, name: id, area: null, difficulty: 'medium', createdOn: '2026-09-01', doneOn, deletedOn: null });

function base(): AppState {
  return {
    ...emptyState(),
    habits: [habit('a'), habit('b'), habit('c')],
    todos: [todo('x'), todo('y', T)],
    logs: { '2026-09-16': { a: 1, b: 1 }, '2026-09-17': { b: 1 }, [T]: { a: 1, c: 1 } },
  };
}

const xp = (s: AppState) => computeProgress(s, T).totalXp;
const ids = (list: { id: string }[]) => list.map((x) => x.id);

describe('deleting', () => {
  it('hides a habit but keeps every bit of XP and history', () => {
    const before = base();
    const after = trashHabits(before, ['a'], T);
    expect(ids(liveHabits(after))).toEqual(['b', 'c']);
    expect(after.logs).toEqual(before.logs);
    expect(xp(after)).toBe(xp(before));
    expect(computeProgress(after, T).bestStreak).toBe(computeProgress(before, T).bestStreak);
    // Deleting one that isn't done today can only help: today no longer waits on it.
    expect(xp(trashHabits(before, ['b'], T))).toBeGreaterThanOrEqual(xp(before));
  });

  it("keeps today if the habit was already done, and doesn't make it due if it wasn't", () => {
    const after = trashHabits(base(), ['a', 'b'], T);
    expect(after.habits.find((h) => h.id === 'a')?.archivedOn).toBe('2026-09-19');
    expect(after.habits.find((h) => h.id === 'b')?.archivedOn).toBe(T);
    // a (done) and c (done) count today; b (not done) isn't due, so today is still perfect.
    expect(dayTally(after, T)).toEqual({ due: 2, done: 2 });
  });

  it('keeps XP from a finished to-do', () => {
    const before = base();
    const after = trashTodo(before, 'y', T);
    expect(after.todos.find((t) => t.id === 'y')?.deletedOn).toBe(T);
    expect(xp(after)).toBe(xp(before));
  });
});

describe('restoring', () => {
  it('brings habits and to-dos back where they were', () => {
    const before = base();
    const deleted = trashTodo(trashHabits(before, ['b'], T), 'x', T);
    const restored = restoreFromTrash(deleted, { habits: ['b'], todos: ['x'] }, 100, T);
    expect(restored.habits).toEqual(before.habits);
    expect(restored.todos).toEqual(before.todos);
    expect(restored.trash).toEqual({ habits: [], todos: [] });
  });

  it('brings a paused habit back paused', () => {
    const paused = { ...base(), habits: [habit('a', '2026-09-10'), habit('b')] };
    const restored = restoreFromTrash(trashHabits(paused, ['a'], T), { habits: ['a'] }, 100, T);
    expect(restored.habits[0].archivedOn).toBe('2026-09-10');
  });

  it("won't go past the habit limit, counting only habits that aren't deleted", () => {
    const deleted = trashHabits(base(), ['a'], T);
    expect(restoreFromTrash(deleted, { habits: ['a'] }, 2, T)).toBe(deleted);
    expect(ids(liveHabits(restoreFromTrash(deleted, { habits: ['a'] }, 3, T)))).toEqual(['a', 'b', 'c']);
  });
});

describe('coming back after days off', () => {
  // A daily habit done every day from the 1st, deleted on the 14th, restored on the 18th.
  const days = Array.from({ length: 13 }, (_, i) => `2026-09-${String(i + 1).padStart(2, '0')}`);
  const streaky = (): AppState => ({ ...emptyState(), habits: [habit('a')], logs: Object.fromEntries(days.map((d) => [d, { a: 1 }])) });

  it("doesn't turn the days it was deleted into missed days", () => {
    const before = computeProgress(streaky(), T);
    const deleted = trashHabits(streaky(), ['a'], '2026-09-14');
    const restored = restoreFromTrash(deleted, { habits: ['a'] }, 100, T);
    expect(restored.habits[0].breaks).toEqual([{ from: '2026-09-14', to: '2026-09-17' }]);
    const after = computeProgress(restored, T);
    expect(after.totalXp).toBe(before.totalXp);
    expect(after.perfectDays).toBe(before.perfectDays);
    expect(after.bestStreak).toBe(before.bestStreak);
    expect(dayTally(restored, '2026-09-15').due).toBe(0);
    expect(dayTally(restored, T).due).toBe(1);
  });

  it('does the same when resuming a paused habit', () => {
    const paused = { ...streaky(), habits: [habit('a', '2026-09-14')] };
    const resumed = { ...paused, habits: [resumeHabit(paused.habits[0], T)] };
    expect(computeProgress(resumed, T).totalXp).toBe(computeProgress(paused, T).totalXp);
    expect(dayTally(resumed, '2026-09-16').due).toBe(0);
  });

  it('adds no break when undone the same day', () => {
    const deleted = trashHabits(base(), ['b'], T);
    expect(restoreFromTrash(deleted, { habits: ['b'] }, 100, T).habits[1].breaks).toEqual([]);
  });
});

describe('the 7-day list', () => {
  it('delete forever stops restoring but keeps XP, and drops unfinished to-dos', () => {
    const before = base();
    const deleted = trashTodo(trashTodo(trashHabits(before, ['a'], T), 'x', T), 'y', T);
    const gone = purgeTrash(deleted);
    expect(gone.trash).toEqual({ habits: [], todos: [] });
    expect(restoreFromTrash(gone, { habits: ['a'] }, 100, T)).toBe(gone);
    expect(ids(gone.todos)).toEqual(['y']);
    expect(xp(gone)).toBe(xp(before));
    expect(ids(purgeTrash(deleted, { habits: ['a'] }).trash.todos)).toEqual(['x', 'y']);
  });

  it('keeps entries for 7 days', () => {
    expect(daysLeft(T, T)).toBe(7);
    expect(daysLeft(T, '2026-09-24')).toBe(1);
    expect(daysLeft(T, '2026-09-25')).toBe(0);
    const deleted = trashHabits(base(), ['a'], T);
    expect(pruneTrash(deleted, '2026-09-24')).toBe(deleted);
    expect(pruneTrash(deleted, '2026-09-25').trash.habits).toEqual([]);
  });
});

describe('saved data', () => {
  it('survives a save and load, and old saves without a trash still load', () => {
    const deleted = trashTodo(trashHabits(base(), ['a'], T), 'x', T);
    expect(parseState(JSON.parse(JSON.stringify(deleted)))).toEqual(deleted);
    const { trash: _omit, ...old } = base();
    expect(parseState(old)?.trash).toEqual({ habits: [], todos: [] });
  });

  it('moves items deleted in 2.8.0 back in as hidden, with their XP', () => {
    const before = base();
    // 2.8.0 took the habit and its logs out of the main lists.
    const legacy = {
      ...before,
      habits: [habit('b'), habit('c')],
      todos: [todo('x')],
      logs: { '2026-09-16': { b: 1 }, '2026-09-17': { b: 1 }, [T]: { c: 1 } },
      trash: {
        habits: [{ habit: habit('a'), logs: { '2026-09-16': 1, [T]: 1 }, deletedOn: T, index: 0 }],
        todos: [{ todo: todo('y', T), deletedOn: T, index: 1 }],
      },
    };
    const loaded = parseState(JSON.parse(JSON.stringify(legacy)))!;
    expect(ids(liveHabits(loaded))).toEqual(['b', 'c']);
    expect(loaded.trash).toEqual({ habits: [{ id: 'a', deletedOn: T, archivedOn: null }], todos: [{ id: 'y', deletedOn: T }] });
    expect(xp(loaded)).toBe(xp(before));
  });
});
