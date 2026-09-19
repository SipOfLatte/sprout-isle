// Shapes of everything the app stores. Anything derived (XP, streaks, levels) lives in engine.ts instead.

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
  /** Only set on to-dos made before chores lost their category. New to-dos leave it null. */
  area: Area | null;
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

export type BossKind = 'slime' | 'wraith' | 'golem' | 'kraken' | 'gremlin' | 'ember';

export interface Boss {
  kind: BossKind;
  hp: number;
}

export type Species = 'sprout' | 'fox' | 'frog';

export interface Companion {
  species: Species;
  name: string;
  adoptedOn: DateKey;
}

export interface Purchase {
  id: string;
  itemId: string;
  cost: number;
  on: DateKey;
}

/** A daily check-in. Either rating can be left blank. */
export interface CheckIn {
  /** 1 (low) to 5 (great). */
  mood: number | null;
  /** 1 (drained) to 5 (energised). */
  energy: number | null;
}

/** A habit in Recently deleted, kept with its history so restoring brings its streaks and charts back. */
export interface DeletedHabit {
  habit: Habit;
  /** logs[date] = amount, taken out of the main logs when the habit was deleted. */
  logs: Record<DateKey, number>;
  deletedOn: DateKey;
  /** Position in the habit list when deleted, so a restore puts it back in place. */
  index: number;
}

export interface DeletedTodo {
  todo: Todo;
  deletedOn: DateKey;
  index: number;
}

export interface Trash {
  habits: DeletedHabit[];
  todos: DeletedTodo[];
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
  /** bosses[weekStart] = that week's boss, generated once like quests. */
  bosses: Record<DateKey, Boss>;
  companion: Companion | null;
  purchases: Purchase[];
  /** placements[slotId] = itemId placed on the island. */
  placements: Record<string, string>;
  checkins: Record<DateKey, CheckIn>;
  /** Recently deleted habits and to-dos, kept for 7 days. */
  trash: Trash;
  isSample: boolean;
  /** Epoch ms of the last local change; drives sync conflict detection. */
  updatedAt: number;
}

export const AREA_LABEL: Record<Area, string> = {
  health: 'Health & body',
  work: 'Work & study',
};

export const XP_BY_DIFFICULTY: Record<Difficulty, number> = { easy: 10, medium: 20, hard: 35 };
