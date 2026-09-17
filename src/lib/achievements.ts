// Achievements are checked against derived progress every render, so nothing about
// them is stored. Unlocking one is just a measure crossing its goal.

import { AREA_LEVEL_BASE, levelInfo, type Progress } from './engine';
import type { AppState } from './types';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  /** Current value toward the goal, capped at goal when unlocked. */
  measure: (p: Progress, s: AppState) => number;
  goal: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-step', name: 'First step', description: 'Complete your first habit', measure: (p) => p.checkIns, goal: 1 },
  { id: 'three-days', name: 'Finding a rhythm', description: 'Reach a 3-day streak', measure: (p) => p.bestStreak, goal: 3 },
  { id: 'week', name: 'A full week', description: 'Reach a 7-day streak', measure: (p) => p.bestStreak, goal: 7 },
  { id: 'month', name: 'Rooted', description: 'Reach a 30-day streak', measure: (p) => p.bestStreak, goal: 30 },
  { id: 'perfect', name: 'Clean sweep', description: 'Finish every habit due in a day', measure: (p) => p.perfectDays, goal: 1 },
  { id: 'perfect-10', name: 'Ten tidy days', description: 'Have 10 perfect days', measure: (p) => p.perfectDays, goal: 10 },
  { id: 'comeback', name: 'Welcome back', description: 'Return after a few days away', measure: (p) => p.comebacks, goal: 1 },
  { id: 'hundred', name: 'Hundred club', description: 'Complete 100 habits', measure: (p) => p.checkIns, goal: 100 },
  { id: 'level-5', name: 'Level 5', description: 'Reach level 5', measure: (p) => levelInfo(p.totalXp).level, goal: 5 },
  { id: 'grove', name: 'Grove keeper', description: 'Grow Health & body to area level 5', measure: (p) => levelInfo(p.areaXp.health, AREA_LEVEL_BASE).level, goal: 5 },
  { id: 'town', name: 'Town builder', description: 'Grow Work & study to area level 5', measure: (p) => levelInfo(p.areaXp.work, AREA_LEVEL_BASE).level, goal: 5 },
  { id: 'errands', name: 'Loose ends', description: 'Finish 5 to-dos', measure: (p) => p.todosDone, goal: 5 },
  { id: 'quest', name: 'Questing', description: 'Complete a weekly quest', measure: (p) => p.questsDone, goal: 1 },
  { id: 'quest-10', name: 'Seasoned adventurer', description: 'Complete 10 weekly quests', measure: (p) => p.questsDone, goal: 10 },
  { id: 'boss', name: 'Giant slayer', description: 'Defeat a weekly boss', measure: (p) => p.bossesDefeated, goal: 1 },
  { id: 'boss-5', name: 'Monster hunter', description: 'Defeat 5 weekly bosses', measure: (p) => p.bossesDefeated, goal: 5 },
  { id: 'decorator', name: 'Decorator', description: 'Place 4 items on your island', measure: (_, s) => Object.keys(s.placements).length, goal: 4 },
  { id: 'friend', name: 'A new friend', description: 'Hatch your companion', measure: (_, s) => (s.companion ? 1 : 0), goal: 1 },
  { id: 'checkin-7', name: 'Checking in', description: 'Log your mood or energy on 7 days', measure: (p) => p.checkInsLogged, goal: 7 },
  { id: 'checkin-30', name: 'Know thyself', description: 'Log your mood or energy on 30 days', measure: (p) => p.checkInsLogged, goal: 30 },
  { id: 'treat', name: 'Earned it', description: 'Redeem your first reward', measure: (_, s) => s.redemptions.length, goal: 1 },
];

export function unlockedIds(p: Progress, s: AppState): Set<string> {
  return new Set(ACHIEVEMENTS.filter((a) => a.measure(p, s) >= a.goal).map((a) => a.id));
}
