// Recently deleted. Deleting hides a habit or to-do but keeps its record and check-ins, so XP,
// streaks and totals already earned never drop. A deleted habit works like a paused one that no
// longer shows anywhere. For 7 days it can be restored from the trash list. After that it stays
// hidden for good, and its past keeps counting.

import { addDays, diffDays, type DateKey } from './dates';
import { amountOn, isDone } from './engine';
import type { AppState, Habit, Todo, Trash } from './types';

export const TRASH_DAYS = 7;
export const MAX_TRASH = { habits: 500, todos: 2_000 };

export const emptyTrash = (): Trash => ({ habits: [], todos: [] });

export const isLive = (item: { deletedOn?: DateKey | null }) => !item.deletedOn;

/** Habits that haven't been deleted. */
export function liveHabits(state: AppState): Habit[] {
  return state.habits.filter(isLive);
}

/** Whole days left before an item deleted on `deletedOn` leaves the list. 0 means it goes today. */
export function daysLeft(deletedOn: DateKey, today: DateKey): number {
  return Math.max(0, TRASH_DAYS - diffDays(deletedOn, today));
}

/** The first day a habit stops being due when it's paused or deleted on `day`. If it was already
 *  done that day, the day still counts, so stopping a habit never takes back XP you earned today. */
export function stopDay(state: AppState, habit: Habit, day: DateKey): DateKey {
  return isDone(habit, amountOn(state, habit.id, day)) ? addDays(day, 1) : day;
}

/** Starts a paused or deleted habit again on `day`. The days it was off are kept as a break, so
 *  they don't turn into missed days. Pass `archivedOn` to put back an older pause instead. */
export function resumeHabit(habit: Habit, day: DateKey, archivedOn: DateKey | null = null): Habit {
  const stoppedOn = habit.archivedOn;
  const breaks = habit.breaks ?? [];
  const gap = stoppedOn !== null && stoppedOn < day && stoppedOn !== archivedOn ? [{ from: stoppedOn, to: addDays(day, -1) }] : [];
  return { ...habit, deletedOn: null, archivedOn, breaks: [...breaks, ...gap] };
}

/** Hides habits and adds them to the trash list. Unknown or already deleted ids are ignored. */
export function trashHabits(state: AppState, ids: string[], day: DateKey): AppState {
  const remove = new Set(ids.filter((id) => state.habits.some((h) => h.id === id && isLive(h))));
  if (remove.size === 0) return state;
  const entries = state.habits.filter((h) => remove.has(h.id)).map((h) => ({ id: h.id, deletedOn: day, archivedOn: h.archivedOn }));
  return {
    ...state,
    habits: state.habits.map((h) =>
      remove.has(h.id) ? { ...h, deletedOn: day, archivedOn: h.archivedOn ?? stopDay(state, h, day) } : h,
    ),
    trash: { ...state.trash, habits: [...state.trash.habits, ...entries].slice(-MAX_TRASH.habits) },
  };
}

export function trashTodo(state: AppState, id: string, day: DateKey): AppState {
  if (!state.todos.some((t) => t.id === id && isLive(t))) return state;
  return {
    ...state,
    todos: state.todos.map((t) => (t.id === id ? { ...t, deletedOn: day } : t)),
    trash: { ...state.trash, todos: [...state.trash.todos, { id, deletedOn: day }].slice(-MAX_TRASH.todos) },
  };
}

/** Un-hides habits and to-dos that are still on the trash list. `maxHabits` stops a restore going over the habit limit. */
export function restoreFromTrash(state: AppState, ids: { habits?: string[]; todos?: string[] }, maxHabits: number, day: DateKey): AppState {
  const habitIds = new Set(ids.habits ?? []);
  const todoIds = new Set(ids.todos ?? []);
  const room = Math.max(0, maxHabits - liveHabits(state).length);
  const habits = state.trash.habits.filter((d) => habitIds.has(d.id)).slice(0, room);
  const todos = state.trash.todos.filter((d) => todoIds.has(d.id));
  if (habits.length === 0 && todos.length === 0) return state;

  const habitEntry = new Map(habits.map((d) => [d.id, d]));
  const restoredTodos = new Set(todos.map((d) => d.id));
  return {
    ...state,
    // A habit that was paused before it was deleted comes back paused.
    habits: state.habits.map((h) => {
      const entry = habitEntry.get(h.id);
      return entry ? resumeHabit(h, day, entry.archivedOn) : h;
    }),
    todos: state.todos.map((t) => (restoredTodos.has(t.id) ? { ...t, deletedOn: null } : t)),
    trash: {
      habits: state.trash.habits.filter((d) => !habitEntry.has(d.id)),
      todos: state.trash.todos.filter((d) => !restoredTodos.has(d.id)),
    },
  };
}

type Entry = { id: string; deletedOn: DateKey };

/** Takes items off the trash list so they can't be restored. Their past still counts. Unfinished
 *  to-dos never earned anything, so those are removed completely. */
function forget(state: AppState, keepHabit: (e: Entry) => boolean, keepTodo: (e: Entry) => boolean = keepHabit): AppState {
  const habits = state.trash.habits.filter(keepHabit);
  const todos = state.trash.todos.filter(keepTodo);
  if (habits.length === state.trash.habits.length && todos.length === state.trash.todos.length) return state;
  const dropped = new Set(state.trash.todos.filter((d) => !keepTodo(d)).map((d) => d.id));
  return {
    ...state,
    todos: state.todos.filter((t) => !(dropped.has(t.id) && t.deletedOn && !t.doneOn)),
    trash: { habits, todos },
  };
}

/** Delete forever. With no ids, it clears the whole list. */
export function purgeTrash(state: AppState, ids?: { habits?: string[]; todos?: string[] }): AppState {
  if (!ids) return forget(state, () => false);
  const habitIds = new Set(ids.habits ?? []);
  const todoIds = new Set(ids.todos ?? []);
  return forget(state, (d) => !habitIds.has(d.id), (d) => !todoIds.has(d.id));
}

/** Drops list entries older than TRASH_DAYS. Returns the same object when nothing expired. */
export function pruneTrash(state: AppState, today: DateKey): AppState {
  return forget(state, (d) => daysLeft(d.deletedOn, today) > 0);
}

/** Trash as saved by 2.8.0, which moved deleted items and their logs out of the main lists. */
export interface LegacyTrash {
  habits: (Trash['habits'][number] | { habit: Habit; logs: Record<DateKey, number>; deletedOn: DateKey })[];
  todos: (Trash['todos'][number] | { todo: Todo; deletedOn: DateKey })[];
}

/** Puts 2.8.0-style deleted items back into the main lists as hidden items, logs included. */
export function upgradeTrash(state: Omit<AppState, 'trash'>, legacy: LegacyTrash): AppState {
  const habits = [...state.habits];
  const todos = [...state.todos];
  const logs = { ...state.logs };
  const trash = emptyTrash();
  for (const entry of legacy.habits) {
    if ('id' in entry) {
      trash.habits.push(entry);
      continue;
    }
    const { habit, deletedOn } = entry;
    if (habits.some((h) => h.id === habit.id)) continue;
    for (const [date, amount] of Object.entries(entry.logs)) logs[date] = { ...(logs[date] ?? {}), [habit.id]: amount };
    const stop = habit.archivedOn ?? (isDone(habit, entry.logs[deletedOn] ?? 0) ? addDays(deletedOn, 1) : deletedOn);
    habits.push({ ...habit, deletedOn, archivedOn: stop });
    trash.habits.push({ id: habit.id, deletedOn, archivedOn: habit.archivedOn });
  }
  for (const entry of legacy.todos) {
    if ('id' in entry) {
      trash.todos.push(entry);
      continue;
    }
    if (todos.some((t) => t.id === entry.todo.id)) continue;
    todos.push({ ...entry.todo, deletedOn: entry.deletedOn });
    trash.todos.push({ id: entry.todo.id, deletedOn: entry.deletedOn });
  }
  return { ...state, habits, todos, logs, trash };
}
