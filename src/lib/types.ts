import type { DateKey } from './dates';

export type Area = 'health' | 'work';
export type Difficulty = 'easy' | 'medium' | 'hard';

export type Schedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] } // ISO weekdays, 0 = Monday
  | { kind: 'weekly'; times: number }; // any days, N times per week

export interface Habit {
  id: string;
  name: string;
  area: Area;
  schedule: Schedule;
  /** 1 for yes/no habits; larger for amounts like 8 glasses. */
  target: number;
  unit: string;
  difficulty: Difficulty;
  createdOn: DateKey;
  archivedOn: DateKey | null;
}

export interface Todo {
  id: string;
  name: string;
  area: Area;
  difficulty: Difficulty;
  createdOn: DateKey;
  doneOn: DateKey | null;
}

export interface Reward {
  id: string;
  name: string;
  cost: number;
}

export interface Redemption {
  id: string;
  rewardId: string;
  name: string;
  cost: number;
  on: DateKey;
}

export type QuestKind = 'habit' | 'perfect' | 'area' | 'total' | 'todos';

export interface Quest {
  id: string;
  kind: QuestKind;
  target: number;
  xp: number;
  habitId?: string;
  /** Habit name when the quest was made, used if the habit is later deleted. */
  habitName?: string;
  area?: Area;
}

/** logs[date][habitId] = amount logged that day. */
export type Logs = Record<DateKey, Record<string, number>>;

export interface AppState {
  version: 1;
  worldName: string;
  habits: Habit[];
  todos: Todo[];
  rewards: Reward[];
  redemptions: Redemption[];
  logs: Logs;
  /** quests[weekStart] = that week's quests, generated once on Monday. */
  quests: Record<DateKey, Quest[]>;
  isSample: boolean;
  /** Epoch ms of the last local change; drives sync conflict detection. */
  updatedAt: number;
}

export const AREA_LABEL: Record<Area, string> = {
  health: 'Health & body',
  work: 'Work & study',
};

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 35 };
