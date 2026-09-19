// Recently deleted. Deleting a habit or to-do moves it here, together with the habit's history,
// so everything else in the app sees it as gone. Restoring puts it all back where it was.
// Items are removed for good 7 days after they were deleted.

import { diffDays, type DateKey } from './dates';
import type { AppState, DeletedHabit, Trash } from './types';

export const TRASH_DAYS = 7;
export const MAX_TRASH = { habits: 500, todos: 2_000 };

export const emptyTrash = (): Trash => ({ habits: [], todos: [] });

/** Whole days left before an item deleted on `deletedOn` is removed. 0 means it goes today. */
export function daysLeft(deletedOn: DateKey, today: DateKey): number {
  return Math.max(0, TRASH_DAYS - diffDays(deletedOn, today));
}

/** Moves habits and their logs into the trash. Unknown ids are ignored. */
export function trashHabits(state: AppState, ids: string[], day: DateKey): AppState {
  const remove = new Set(ids.filter((id) => state.habits.some((h) => h.id === id)));
  if (remove.size === 0) return state;

  // Positions are recorded as if the habits were deleted one by one, so restoring in reverse order puts each back exactly.
  const moved: DeletedHabit[] = [];
  state.habits.forEach((habit, index) => {
    if (remove.has(habit.id)) moved.push({ habit, logs: {}, deletedOn: day, index: index - moved.length });
  });
  const byId = new Map(moved.map((m) => [m.habit.id, m]));

  const logs: AppState['logs'] = {};
  for (const [date, entries] of Object.entries(state.logs)) {
    const kept: Record<string, number> = {};
    for (const [id, amount] of Object.entries(entries)) {
      const target = byId.get(id);
      if (target) target.logs[date] = amount;
      else kept[id] = amount;
    }
    if (Object.keys(kept).length) logs[date] = kept;
  }

  return {
    ...state,
    habits: state.habits.filter((h) => !remove.has(h.id)),
    logs,
    trash: { ...state.trash, habits: [...state.trash.habits, ...moved].slice(-MAX_TRASH.habits) },
  };
}

export function trashTodo(state: AppState, id: string, day: DateKey): AppState {
  const index = state.todos.findIndex((t) => t.id === id);
  if (index < 0) return state;
  return {
    ...state,
    todos: state.todos.filter((t) => t.id !== id),
    trash: { ...state.trash, todos: [...state.trash.todos, { todo: state.todos[index], deletedOn: day, index }].slice(-MAX_TRASH.todos) },
  };
}

/** Inserts items back at the positions they had when deleted. `items` is in deletion order, so the
 *  latest deletion goes back first, like unwinding an undo stack. */
function reinsert<T>(list: T[], items: { item: T; index: number }[]): T[] {
  const next = [...list];
  for (const { item, index } of [...items].reverse()) next.splice(Math.min(index, next.length), 0, item);
  return next;
}

/** Puts habits (with their history) and to-dos back. `maxHabits` stops a restore going over the habit limit. */
export function restoreFromTrash(state: AppState, ids: { habits?: string[]; todos?: string[] }, maxHabits: number): AppState {
  const habitIds = new Set(ids.habits ?? []);
  const todoIds = new Set(ids.todos ?? []);
  const room = Math.max(0, maxHabits - state.habits.length);
  // Skips anything whose id is already live, which can only happen with odd synced data.
  const habits = state.trash.habits.filter((d) => habitIds.has(d.habit.id) && !state.habits.some((h) => h.id === d.habit.id)).slice(0, room);
  const todos = state.trash.todos.filter((d) => todoIds.has(d.todo.id) && !state.todos.some((t) => t.id === d.todo.id));
  if (habits.length === 0 && todos.length === 0) return state;

  const logs = { ...state.logs };
  for (const d of habits) {
    for (const [date, amount] of Object.entries(d.logs)) logs[date] = { ...(logs[date] ?? {}), [d.habit.id]: amount };
  }
  const restoredHabits = new Set(habits.map((d) => d.habit.id));
  const restoredTodos = new Set(todos.map((d) => d.todo.id));

  return {
    ...state,
    habits: reinsert(state.habits, habits.map((d) => ({ item: d.habit, index: d.index }))),
    todos: reinsert(state.todos, todos.map((d) => ({ item: d.todo, index: d.index }))),
    logs,
    trash: {
      habits: state.trash.habits.filter((d) => !restoredHabits.has(d.habit.id)),
      todos: state.trash.todos.filter((d) => !restoredTodos.has(d.todo.id)),
    },
  };
}

/** Removes items from the trash for good. With no ids, it empties the trash. */
export function purgeTrash(state: AppState, ids?: { habits?: string[]; todos?: string[] }): AppState {
  if (!ids) return state.trash.habits.length || state.trash.todos.length ? { ...state, trash: emptyTrash() } : state;
  const habitIds = new Set(ids.habits ?? []);
  const todoIds = new Set(ids.todos ?? []);
  const trash = {
    habits: state.trash.habits.filter((d) => !habitIds.has(d.habit.id)),
    todos: state.trash.todos.filter((d) => !todoIds.has(d.todo.id)),
  };
  const changed = trash.habits.length !== state.trash.habits.length || trash.todos.length !== state.trash.todos.length;
  return changed ? { ...state, trash } : state;
}

/** Drops items older than TRASH_DAYS. Returns the same object when nothing expired. */
export function pruneTrash(trash: Trash, today: DateKey): Trash {
  const habits = trash.habits.filter((d) => daysLeft(d.deletedOn, today) > 0);
  const todos = trash.todos.filter((d) => daysLeft(d.deletedOn, today) > 0);
  return habits.length === trash.habits.length && todos.length === trash.todos.length ? trash : { habits, todos };
}
