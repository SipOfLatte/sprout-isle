// The companion: grows with every habit you finish, and its mood is written
// to make coming back after a missed day feel like the win it is.

import { addDays, diffDays, range, type DateKey } from './dates';
import { dayTally } from './engine';
import { seedFrom } from './quests';
import type { AppState, Companion } from './types';

/** Completions needed to reach each stage (baby, young, grown). */
export const STAGE_AT = [0, 20, 75];
export const STAGE_NAMES = ['Baby', 'Young', 'Grown'];

export function bond(state: AppState, companion: Companion, today: DateKey): number {
  if (companion.adoptedOn > today) return 0;
  let n = 0;
  for (const d of range(companion.adoptedOn, today)) n += dayTally(state, d).done;
  n += state.todos.filter((t) => t.doneOn && t.doneOn >= companion.adoptedOn && t.doneOn <= today).length;
  return n;
}

export function stageFor(bondPoints: number): { stage: number; next: number | null } {
  let stage = 0;
  STAGE_AT.forEach((at, i) => {
    if (bondPoints >= at) stage = i;
  });
  return { stage, next: STAGE_AT[stage + 1] ?? null };
}

export type PetMood = 'curious' | 'happy' | 'proud' | 'overjoyed' | 'waiting' | 'missing' | 'gentle';

function activeOn(state: AppState, day: DateKey): boolean {
  return (
    Object.values(state.logs[day] ?? {}).some((v) => v > 0) ||
    state.todos.some((t) => t.doneOn === day) ||
    Boolean(state.checkins[day])
  );
}

export function petMood(state: AppState, today: DateKey): PetMood {
  let last: DateKey | null = null;
  for (let d = addDays(today, -1), i = 0; i < 90; d = addDays(d, -1), i++) {
    if (activeOn(state, d)) {
      last = d;
      break;
    }
  }
  const gap = last ? diffDays(last, today) : null;

  if (activeOn(state, today)) {
    const { due, done } = dayTally(state, today);
    const allDone = due > 0 && done === due;
    // A low check-in gets comfort before cheerleading, unless the day went fully right.
    const mood = state.checkins[today]?.mood;
    if (mood !== null && mood !== undefined && mood <= 2 && !allDone) return 'gentle';
    if (gap !== null && gap >= 2) return 'overjoyed';
    if (allDone) return 'proud';
    return 'happy';
  }
  if (gap === null) return 'curious';
  return gap === 1 ? 'waiting' : 'missing';
}

const LINES: Record<PetMood, string[]> = {
  curious: [
    "Hi, I'm {name}! Finish one thing and watch what grows.",
    'A whole island, just for us. Where shall we start?',
  ],
  waiting: [
    'Yesterday went well. Want to keep it rolling?',
    'No rush. Start with the easiest one.',
    'I saved you a spot on the ledge. One habit when you are ready.',
  ],
  missing: [
    'There you are! No catching up needed. One small thing today is plenty.',
    'I kept the island tidy while you were away. Welcome back.',
    "Missed days don't count against you here. Pick one easy win.",
  ],
  overjoyed: [
    "You came back! That's the hardest part, and you did it.",
    "Welcome back! That comeback bonus is yours. I'm doing a little dance.",
    'You showed up again. That matters more than any streak.',
  ],
  happy: [
    'Nice! Every tick grows the island a little.',
    'That one landed. The boss definitely felt it.',
    'Look at you go. What’s next?',
  ],
  gentle: [
    "Rough one? Thanks for telling me. The smallest habit still counts today.",
    "Low days happen. Be kind to yourself; one easy thing is plenty.",
    "I'm right here. Rest counts too.",
  ],
  proud: [
    'Everything done today. I’m so proud of you.',
    'Perfect day! Put your feet up.',
    'Clean sweep. The whole island is glowing.',
  ],
};

export function petLine(mood: PetMood, name: string, today: DateKey): string {
  const lines = LINES[mood];
  return lines[seedFrom(today + mood) % lines.length].replace('{name}', name);
}
