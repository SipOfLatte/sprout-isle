// App state lives in one reducer. Stored data goes in, and derived progress (XP, streaks,
// boss results, owned items) is recomputed from it with useMemo.

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { todayKey, type DateKey } from '../lib/dates';
import { computeProgress, type Progress } from '../lib/engine';
import { bossOutcomes, generateBoss, pruneBosses } from '../lib/bosses';
import { ITEMS_BY_ID, SLOTS, slotAccepts } from '../lib/catalog';
import { startOfWeek } from '../lib/dates';
import { reorderSubset } from '../lib/order';
import { pruneQuests, questRewards, questsToGenerate } from '../lib/quests';
import { MAX_HABITS } from '../lib/schema';
import { loadState, newId, saveState } from '../lib/storage';
import { purgeTrash, pruneTrash, restoreFromTrash, trashHabits, trashTodo } from '../lib/trash';
import type { AppState, Boss, Difficulty, Habit, Quest, Reward, Species } from '../lib/types';

export type Action =
  | { type: 'setAmount'; habitId: string; day: DateKey; amount: number }
  | { type: 'saveHabit'; habit: Habit }
  | { type: 'archiveHabit'; id: string; day: DateKey }
  | { type: 'restoreHabit'; id: string }
  | { type: 'deleteHabit'; id: string; day: DateKey }
  /** Moves every paused habit into Recently deleted. */
  | { type: 'deletePaused'; day: DateKey }
  | { type: 'addTodo'; name: string; difficulty: Difficulty; day: DateKey }
  | { type: 'toggleTodo'; id: string; day: DateKey }
  | { type: 'deleteTodo'; id: string; day: DateKey }
  | { type: 'restoreDeleted'; habits?: string[]; todos?: string[] }
  /** Removes items from Recently deleted for good. With no ids, it clears the whole list. */
  | { type: 'deleteForever'; habits?: string[]; todos?: string[] }
  | { type: 'pruneTrash'; today: DateKey }
  | { type: 'reorderHabits'; ids: string[] }
  | { type: 'reorderTodos'; ids: string[] }
  | { type: 'saveReward'; reward: Reward }
  | { type: 'deleteReward'; id: string }
  | { type: 'redeem'; rewardId: string; day: DateKey }
  | { type: 'setWorldName'; name: string }
  | { type: 'setQuests'; weekStart: DateKey; quests: Quest[] }
  | { type: 'setBoss'; weekStart: DateKey; boss: Boss }
  | { type: 'adopt'; species: Species; name: string; day: DateKey }
  | { type: 'renamePet'; name: string }
  | { type: 'buy'; itemId: string; day: DateKey }
  | { type: 'place'; slotId: string; itemId: string }
  | { type: 'unplace'; slotId: string }
  | { type: 'checkIn'; day: DateKey; mood?: number | null; energy?: number | null }
  /** `fromSync` keeps the incoming timestamp so a pulled copy isn't seen as a new local edit. */
  | { type: 'replace'; state: AppState; fromSync?: boolean };

function reducer(state: AppState, action: Action): AppState {
  if (action.type === 'replace') return action.fromSync ? action.state : { ...action.state, updatedAt: Date.now() };
  // Weekly generation isn't a user edit: every device generates the same result from
  // the same data, so it doesn't bump updatedAt (which would cause sync conflicts).
  if (action.type === 'setQuests') {
    return { ...state, quests: pruneQuests({ ...state.quests, [action.weekStart]: action.quests }) };
  }
  if (action.type === 'setBoss') {
    return { ...state, bosses: pruneBosses({ ...state.bosses, [action.weekStart]: action.boss }) };
  }
  // Clearing out old deletions is the same on every device, so it isn't a user edit either.
  if (action.type === 'pruneTrash') {
    const trash = pruneTrash(state.trash, action.today);
    return trash === state.trash ? state : { ...state, trash };
  }
  const next = apply(state, action);
  return next === state ? state : { ...next, updatedAt: Date.now() };
}

function apply(state: AppState, action: Exclude<Action, { type: 'replace' | 'setQuests' | 'setBoss' | 'pruneTrash' }>): AppState {
  switch (action.type) {
    case 'setAmount': {
      const day = { ...(state.logs[action.day] ?? {}) };
      if (action.amount > 0) day[action.habitId] = Math.min(10_000, Math.round(action.amount));
      else delete day[action.habitId];
      const logs = { ...state.logs, [action.day]: day };
      if (Object.keys(day).length === 0) delete logs[action.day];
      return { ...state, logs };
    }
    case 'saveHabit': {
      const exists = state.habits.some((h) => h.id === action.habit.id);
      const habits = exists
        ? state.habits.map((h) => (h.id === action.habit.id ? action.habit : h))
        : [...state.habits, action.habit];
      return { ...state, habits };
    }
    case 'archiveHabit':
      return { ...state, habits: state.habits.map((h) => (h.id === action.id ? { ...h, archivedOn: action.day } : h)) };
    case 'restoreHabit':
      return { ...state, habits: state.habits.map((h) => (h.id === action.id ? { ...h, archivedOn: null } : h)) };
    // Deleting moves the habit and its history into Recently deleted, where it can be restored for 7 days.
    case 'deleteHabit':
      return trashHabits(state, [action.id], action.day);
    case 'deletePaused':
      return trashHabits(state, state.habits.filter((h) => h.archivedOn !== null).map((h) => h.id), action.day);
    case 'restoreDeleted':
      return restoreFromTrash(state, action, MAX_HABITS);
    case 'deleteForever':
      return purgeTrash(state, action.habits || action.todos ? action : undefined);
    case 'addTodo':
      return {
        ...state,
        todos: [
          ...state.todos,
          { id: newId(), name: action.name, area: null, difficulty: action.difficulty, createdOn: action.day, doneOn: null },
        ],
      };
    case 'toggleTodo':
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === action.id ? { ...t, doneOn: t.doneOn ? null : action.day } : t)),
      };
    // A drag reorders only the rows on screen; reorderSubset keeps everything else in place.
    case 'reorderHabits':
      return { ...state, habits: reorderSubset(state.habits, action.ids) };
    case 'reorderTodos':
      return { ...state, todos: reorderSubset(state.todos, action.ids) };
    case 'deleteTodo':
      return trashTodo(state, action.id, action.day);
    case 'saveReward': {
      const exists = state.rewards.some((r) => r.id === action.reward.id);
      return {
        ...state,
        rewards: exists
          ? state.rewards.map((r) => (r.id === action.reward.id ? action.reward : r))
          : [...state.rewards, action.reward],
      };
    }
    case 'deleteReward':
      return { ...state, rewards: state.rewards.filter((r) => r.id !== action.id) };
    case 'redeem': {
      const reward = state.rewards.find((r) => r.id === action.rewardId);
      if (!reward) return state;
      return {
        ...state,
        redemptions: [...state.redemptions, { id: newId(), rewardId: reward.id, name: reward.name, cost: reward.cost, on: action.day }],
      };
    }
    case 'setWorldName':
      return { ...state, worldName: action.name.trim().slice(0, 40) || 'Sprout Isle' };
    case 'adopt':
      if (state.companion) return state;
      return { ...state, companion: { species: action.species, name: cleanName(action.name, action.species), adoptedOn: action.day } };
    case 'renamePet':
      return state.companion ? { ...state, companion: { ...state.companion, name: cleanName(action.name, state.companion.species) } } : state;
    case 'buy': {
      // The UI checks the coin balance; this guards against buying loot or duplicates.
      const item = ITEMS_BY_ID.get(action.itemId);
      if (!item || item.price === null || state.purchases.some((p) => p.itemId === item.id)) return state;
      return { ...state, purchases: [...state.purchases, { id: newId(), itemId: item.id, cost: item.price, on: action.day }] };
    }
    case 'place': {
      const slot = SLOTS.find((s) => s.id === action.slotId);
      const item = ITEMS_BY_ID.get(action.itemId);
      if (!slot || !item || !slotAccepts(slot, item.kind)) return state;
      // An item lives in one slot at a time, so placing it again moves it.
      const placements = Object.fromEntries(Object.entries(state.placements).filter(([, id]) => id !== item.id));
      return { ...state, placements: { ...placements, [slot.id]: item.id } };
    }
    // Ratings are clamped to 1 to 5. Passing null clears one, and clearing both removes the day's entry.
    case 'checkIn': {
      const current = state.checkins[action.day] ?? { mood: null, energy: null };
      const valid = (v: number | null | undefined, fallback: number | null) =>
        v === undefined ? fallback : v === null ? null : Math.min(5, Math.max(1, Math.round(v)));
      const next = { mood: valid(action.mood, current.mood), energy: valid(action.energy, current.energy) };
      const checkins = { ...state.checkins };
      if (next.mood === null && next.energy === null) delete checkins[action.day];
      else checkins[action.day] = next;
      return { ...state, checkins };
    }
    case 'unplace': {
      const placements = { ...state.placements };
      delete placements[action.slotId];
      return { ...state, placements };
    }
  }
}

interface Store {
  state: AppState;
  dispatch: (a: Action) => void;
  progress: Progress;
  today: DateKey;
  saveFailed: boolean;
  owned: Set<string>;
}

/** Trims a pet name, falling back to the species' default name if it ends up empty. */
function cleanName(name: string, species: Species): string {
  const trimmed = name.trim().slice(0, 20);
  return trimmed || { sprout: 'Sprig', fox: 'Maple', frog: 'Lily' }[species];
}

const StoreContext = createContext<Store | null>(null);

/** Today's date key. It rechecks every minute and when the tab becomes visible, so leaving the
 *  app open past midnight rolls over to the new day. */
function useToday(): DateKey {
  const [today, setToday] = useState(todayKey);
  useEffect(() => {
    const id = setInterval(() => setToday(todayKey()), 60_000);
    const onVisible = () => setToday(todayKey());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);
  return today;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);
  const today = useToday();
  const [saveFailed, setSaveFailed] = useState(false);

  // Save after every change. If the browser blocks storage, the app shows a warning.
  useEffect(() => {
    setSaveFailed(!saveState(state));
  }, [state]);

  // Generate this week's quests and boss the first time the week is seen.
  useEffect(() => {
    const pending = questsToGenerate(state, today);
    if (pending) dispatch({ type: 'setQuests', ...pending });
    const weekStart = startOfWeek(today);
    if (!state.bosses[weekStart]) {
      const boss = generateBoss(state, weekStart);
      if (boss) dispatch({ type: 'setBoss', weekStart, boss });
    }
  }, [state, today]);

  // Recently deleted keeps items for 7 days. The reducer ignores this when nothing has expired.
  useEffect(() => {
    dispatch({ type: 'pruneTrash', today });
  }, [state.trash, today]);

  const { progress, loot } = useMemo(() => {
    const bosses = bossOutcomes(state, today);
    return {
      progress: computeProgress(state, today, { questXp: questRewards(state, today), bossXp: bosses.xpByDay }),
      loot: bosses.loot,
    };
  }, [state, today]);

  // Owned = bought in the store plus loot from beaten bosses.
  const owned = useMemo(() => new Set([...state.purchases.map((p) => p.itemId), ...loot]), [state.purchases, loot]);

  const value = useMemo(() => ({ state, dispatch, progress, today, saveFailed, owned }), [state, progress, today, saveFailed, owned]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
