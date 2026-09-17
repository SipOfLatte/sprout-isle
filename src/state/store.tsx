import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import { todayKey, type DateKey } from '../lib/dates';
import { computeProgress, type Progress } from '../lib/engine';
import { pruneQuests, questRewards, questsToGenerate } from '../lib/quests';
import { loadState, newId, saveState } from '../lib/storage';
import type { AppState, Area, Difficulty, Habit, Quest, Reward } from '../lib/types';

export type Action =
  | { type: 'setAmount'; habitId: string; day: DateKey; amount: number }
  | { type: 'saveHabit'; habit: Habit }
  | { type: 'archiveHabit'; id: string; day: DateKey }
  | { type: 'restoreHabit'; id: string }
  | { type: 'deleteHabit'; id: string }
  | { type: 'addTodo'; name: string; area: Area; difficulty: Difficulty; day: DateKey }
  | { type: 'toggleTodo'; id: string; day: DateKey }
  | { type: 'deleteTodo'; id: string }
  | { type: 'saveReward'; reward: Reward }
  | { type: 'deleteReward'; id: string }
  | { type: 'redeem'; rewardId: string; day: DateKey }
  | { type: 'setWorldName'; name: string }
  | { type: 'setQuests'; weekStart: DateKey; quests: Quest[] }
  /** `fromSync` keeps the incoming timestamp so a pulled copy isn't seen as a new local edit. */
  | { type: 'replace'; state: AppState; fromSync?: boolean };

function reducer(state: AppState, action: Action): AppState {
  if (action.type === 'replace') return action.fromSync ? action.state : { ...action.state, updatedAt: Date.now() };
  if (action.type === 'setQuests') {
    // Not a user edit: every device generates the same quests from the same data,
    // so this doesn't bump updatedAt (which would trigger needless sync conflicts).
    return { ...state, quests: pruneQuests({ ...state.quests, [action.weekStart]: action.quests }) };
  }
  const next = apply(state, action);
  return next === state ? state : { ...next, updatedAt: Date.now() };
}

function apply(state: AppState, action: Exclude<Action, { type: 'replace' | 'setQuests' }>): AppState {
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
    case 'deleteHabit': {
      const logs: AppState['logs'] = {};
      for (const [day, entries] of Object.entries(state.logs)) {
        const rest = Object.fromEntries(Object.entries(entries).filter(([id]) => id !== action.id));
        if (Object.keys(rest).length) logs[day] = rest;
      }
      return { ...state, habits: state.habits.filter((h) => h.id !== action.id), logs };
    }
    case 'addTodo':
      return {
        ...state,
        todos: [
          ...state.todos,
          { id: newId(), name: action.name, area: action.area, difficulty: action.difficulty, createdOn: action.day, doneOn: null },
        ],
      };
    case 'toggleTodo':
      return {
        ...state,
        todos: state.todos.map((t) => (t.id === action.id ? { ...t, doneOn: t.doneOn ? null : action.day } : t)),
      };
    case 'deleteTodo':
      return { ...state, todos: state.todos.filter((t) => t.id !== action.id) };
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
  }
}

interface Store {
  state: AppState;
  dispatch: (a: Action) => void;
  progress: Progress;
  today: DateKey;
  saveFailed: boolean;
}

const StoreContext = createContext<Store | null>(null);

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

  useEffect(() => {
    setSaveFailed(!saveState(state));
  }, [state]);

  useEffect(() => {
    const pending = questsToGenerate(state, today);
    if (pending) dispatch({ type: 'setQuests', ...pending });
  }, [state, today]);

  const progress = useMemo(() => computeProgress(state, today, questRewards(state, today)), [state, today]);
  const value = useMemo(() => ({ state, dispatch, progress, today, saveFailed }), [state, progress, today, saveFailed]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}
