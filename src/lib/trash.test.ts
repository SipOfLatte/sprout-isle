import { describe, expect, it } from 'vitest';
import { computeProgress } from './engine';
import { parseState } from './schema';
import { emptyState } from './storage';
import { daysLeft, pruneTrash, purgeTrash, restoreFromTrash, trashHabits, trashTodo } from './trash';
import type { AppState, Habit, Todo } from './types';

const T = '2026-09-18';

const habit = (id: string, archivedOn: string | null = null): Habit => ({
  id, name: id, area: 'health', schedule: { kind: 'daily' }, target: 1, unit: '', difficulty: 'easy', createdOn: '2026-09-01', archivedOn,
});
const todo = (id: string): Todo => ({ id, name: id, area: null, difficulty: 'easy', createdOn: '2026-09-01', doneOn: null });

function base(): AppState {
  return {
    ...emptyState(),
    habits: [habit('a'), habit('b'), habit('c')],
    todos: [todo('x'), todo('y')],
    logs: { '2026-09-16': { a: 1, b: 1 }, '2026-09-17': { b: 1 }, [T]: { a: 1, b: 1, c: 1 } },
  };
}

describe('trash', () => {
  it('moves a habit and its history out, then restores both in place', () => {
    const before = base();
    const deleted = trashHabits(before, ['b'], T);
    expect(deleted.habits.map((h) => h.id)).toEqual(['a', 'c']);
    expect(deleted.logs).toEqual({ '2026-09-16': { a: 1 }, [T]: { a: 1, c: 1 } });
    expect(deleted.trash.habits[0]).toMatchObject({ deletedOn: T, index: 1, logs: { '2026-09-16': 1, '2026-09-17': 1, [T]: 1 } });

    const restored = restoreFromTrash(deleted, { habits: ['b'] }, 100);
    expect(restored.habits.map((h) => h.id)).toEqual(['a', 'b', 'c']);
    expect(restored.logs).toEqual(before.logs);
    expect(restored.trash.habits).toEqual([]);
    // Streaks and XP come back exactly as they were.
    expect(computeProgress(restored, T)).toEqual(computeProgress(before, T));
  });

  it('restores several deletions to their original positions', () => {
    const deleted = trashHabits(trashHabits(base(), ['a'], T), ['c'], T);
    const restored = restoreFromTrash(deleted, { habits: ['c', 'a'] }, 100);
    expect(restored.habits.map((h) => h.id)).toEqual(['a', 'b', 'c']);
  });

  it('restores a batch delete in place', () => {
    const four = { ...base(), habits: [habit('a', T), habit('b', T), habit('c'), habit('d', T)] };
    const deleted = trashHabits(four, ['a', 'b', 'd'], T);
    expect(deleted.habits.map((h) => h.id)).toEqual(['c']);
    expect(restoreFromTrash(deleted, { habits: ['a', 'b', 'd'] }, 100).habits.map((h) => h.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('trashes and restores to-dos in place', () => {
    const deleted = trashTodo(base(), 'x', T);
    expect(deleted.todos.map((t) => t.id)).toEqual(['y']);
    expect(restoreFromTrash(deleted, { todos: ['x'] }, 100).todos.map((t) => t.id)).toEqual(['x', 'y']);
  });

  it("won't restore past the habit limit", () => {
    const deleted = trashHabits(base(), ['a'], T);
    expect(restoreFromTrash(deleted, { habits: ['a'] }, 2)).toBe(deleted);
  });

  it('deletes items for good, one at a time or all at once', () => {
    const deleted = trashTodo(trashHabits(base(), ['a', 'b'], T), 'x', T);
    expect(purgeTrash(deleted, { habits: ['a'] }).trash.habits.map((d) => d.habit.id)).toEqual(['b']);
    expect(purgeTrash(deleted).trash).toEqual({ habits: [], todos: [] });
  });

  it('keeps items for 7 days', () => {
    expect(daysLeft(T, T)).toBe(7);
    expect(daysLeft(T, '2026-09-24')).toBe(1);
    expect(daysLeft(T, '2026-09-25')).toBe(0);
    const trash = trashHabits(base(), ['a'], T).trash;
    expect(pruneTrash(trash, '2026-09-24')).toBe(trash);
    expect(pruneTrash(trash, '2026-09-25').habits).toEqual([]);
  });

  it('survives a save and load, and old saves without a trash still load', () => {
    const deleted = trashHabits(base(), ['a'], T);
    expect(parseState(JSON.parse(JSON.stringify(deleted)))?.trash).toEqual(deleted.trash);
    const { trash: _omit, ...old } = base();
    expect(parseState(old)?.trash).toEqual({ habits: [], todos: [] });
  });
});
