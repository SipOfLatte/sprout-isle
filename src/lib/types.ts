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
  isSample: boolean;
}

export const AREA_LABEL: Record<Area, string> = {
  health: 'Health & body',
  work: 'Work & study',
};

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 35 };
