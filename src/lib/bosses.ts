// Weekly boss battles. Each finished habit deals damage by effort, so a
// partial week still hurts the boss and one bad day never loses the fight.
// HP is sized from your recent weeks. Like quests, bosses are stored once
// generated and everything else (damage, wins, loot) is derived.

import { BOSSES } from './catalog';
import { addDays, minKey, range, type DateKey } from './dates';
import { amountOn, isActiveOn, isDone, isPinnedTo, weekCompletions } from './engine';
import { expectedInWeek, seedFrom } from './quests';
import { mulberry32 } from './sample';
import type { AppState, Boss, BossKind, Difficulty } from './types';

export const DAMAGE: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
export const TODO_DAMAGE = 1;
export const PERFECT_DAY_DAMAGE = 2;
export const BOSS_XP = 80;
/** XP instead of loot when you beat a boss you already have the loot from. */
export const REPEAT_BOSS_XP = 40;
const HP_FACTOR = 0.85;
const NEW_PLAYER_FACTOR = 0.6;
const MIN_HP = 8;
const MAX_HP = 600;
const MAX_STORED_WEEKS = 26;

const KINDS = Object.keys(BOSSES) as BossKind[];

export function dayDamage(state: AppState, day: DateKey): number {
  let dmg = 0;
  let pinned = 0;
  let pinnedDone = 0;
  for (const h of state.habits) {
    if (!isActiveOn(h, day)) continue;
    const done = isDone(h, amountOn(state, h.id, day));
    if (isPinnedTo(h, day)) {
      pinned++;
      if (done) pinnedDone++;
    }
    if (!done) continue;
    const s = h.schedule;
    const counts = s.kind === 'weekly' ? weekCompletions(state, h, day) <= s.times : isPinnedTo(h, day);
    if (counts) dmg += DAMAGE[h.difficulty];
  }
  dmg += state.todos.filter((t) => t.doneOn === day).length * TODO_DAMAGE;
  if (pinned > 0 && pinnedDone === pinned) dmg += PERFECT_DAY_DAMAGE;
  return dmg;
}

export function generateBoss(state: AppState, weekStart: DateKey): Boss | null {
  const days = range(weekStart, addDays(weekStart, 6));
  const habits = state.habits.filter((h) => days.some((d) => isActiveOn(h, d)));
  if (habits.length === 0) return null;

  // Average weekly damage over the last four weeks you had habits.
  let total = 0;
  let weeks = 0;
  for (let w = 1; w <= 4; w++) {
    const ws = addDays(weekStart, -7 * w);
    const wdays = range(ws, addDays(ws, 6));
    if (!state.habits.some((h) => wdays.some((d) => isActiveOn(h, d)))) continue;
    weeks++;
    total += wdays.reduce((s, d) => s + dayDamage(state, d), 0);
  }

  const expected = habits.reduce((s, h) => s + expectedInWeek(h, weekStart) * DAMAGE[h.difficulty], 0);
  const raw = weeks > 0 && total > 0 ? (total / weeks) * HP_FACTOR : expected * NEW_PLAYER_FACTOR;
  const hp = Math.round(Math.min(MAX_HP, Math.max(MIN_HP, raw)));

  const lastWeek = state.bosses[addDays(weekStart, -7)]?.kind;
  const choices = KINDS.filter((k) => k !== lastWeek);
  const rand = mulberry32(seedFrom(`boss-${weekStart}`));
  return { kind: choices[Math.floor(rand() * choices.length)], hp };
}

export interface BossStatus {
  boss: Boss;
  weekStart: DateKey;
  damage: number;
  defeatedOn: DateKey | null;
}

export function evaluateBoss(state: AppState, weekStart: DateKey, boss: Boss, today: DateKey): BossStatus {
  let damage = 0;
  let defeatedOn: DateKey | null = null;
  for (const d of range(weekStart, minKey(addDays(weekStart, 6), today))) {
    damage += dayDamage(state, d);
    if (!defeatedOn && damage >= boss.hp) defeatedOn = d;
  }
  return { boss, weekStart, damage, defeatedOn };
}

export interface BossOutcomes {
  xpByDay: Record<DateKey, number[]>;
  /** Loot item ids earned, in the order they dropped. */
  loot: string[];
  defeated: number;
  /** Which week's win dropped each loot item. */
  lootWeek: Record<string, DateKey>;
}

export function bossOutcomes(state: AppState, today: DateKey): BossOutcomes {
  const out: BossOutcomes = { xpByDay: {}, loot: [], defeated: 0, lootWeek: {} };
  for (const weekStart of Object.keys(state.bosses).sort()) {
    if (weekStart > today) continue;
    const { defeatedOn, boss } = evaluateBoss(state, weekStart, state.bosses[weekStart], today);
    if (!defeatedOn) continue;
    out.defeated++;
    const loot = BOSSES[boss.kind].loot;
    const firstWin = !out.loot.includes(loot);
    if (firstWin) {
      out.loot.push(loot);
      out.lootWeek[loot] = weekStart;
    }
    (out.xpByDay[defeatedOn] ??= []).push(firstWin ? BOSS_XP : BOSS_XP + REPEAT_BOSS_XP);
  }
  return out;
}

export function pruneBosses(bosses: AppState['bosses']): AppState['bosses'] {
  const keys = Object.keys(bosses).sort().slice(-MAX_STORED_WEEKS);
  return Object.fromEntries(keys.map((k) => [k, bosses[k]]));
}
