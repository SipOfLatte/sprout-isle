// A believable 90-day history for demoing Insights: an upward trend, weekend
// dips, a rough week with a comeback, and habits that genuinely co-vary
// (sleeping on time makes deep work more likely).

import { addDays, range, weekday, type DateKey } from './dates';
import { newId } from './storage';
import type { AppState, Habit } from './types';

/** Small, fast, seedable PRNG so the sample is the same every time. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sampleState(today: DateKey, days = 90): AppState {
  const rand = mulberry32(20260917);
  const start = addDays(today, -(days - 1));

  const habit = (partial: Omit<Habit, 'id' | 'archivedOn' | 'createdOn' | 'unit' | 'target'> &
    Partial<Pick<Habit, 'createdOn' | 'unit' | 'target'>>): Habit => ({
    id: newId(),
    archivedOn: null,
    createdOn: start,
    unit: '',
    target: 1,
    ...partial,
  });

  const walk = habit({ name: 'Walk 20 minutes', area: 'health', schedule: { kind: 'daily' }, difficulty: 'easy' });
  const water = habit({ name: 'Drink water', area: 'health', schedule: { kind: 'daily' }, difficulty: 'medium', target: 8, unit: 'glasses' });
  const gym = habit({ name: 'Gym session', area: 'health', schedule: { kind: 'weekdays', days: [0, 2, 4] }, difficulty: 'hard' });
  const sleep = habit({ name: 'In bed by 11:30', area: 'health', schedule: { kind: 'daily' }, difficulty: 'medium' });
  const deep = habit({ name: 'Deep work block', area: 'work', schedule: { kind: 'weekdays', days: [0, 1, 2, 3, 4] }, difficulty: 'hard' });
  const study = habit({ name: 'Study statistics', area: 'work', schedule: { kind: 'weekly', times: 4 }, difficulty: 'medium', createdOn: addDays(start, 20) });
  const plan = habit({ name: 'Plan tomorrow', area: 'work', schedule: { kind: 'daily' }, difficulty: 'easy' });

  const habits = [walk, water, gym, sleep, deep, study, plan];
  const logs: AppState['logs'] = {};
  const roughWeek = [addDays(start, 38), addDays(start, 43)];
  // Moods use their own generator so habit history stays the same as before.
  const moodRand = mulberry32(4242);
  const checkins: AppState['checkins'] = {};
  const rating = (v: number) => Math.max(1, Math.min(5, Math.round(v)));
  let sleptLastNight = false;

  for (const [i, day] of range(start, today).entries()) {
    if (day >= roughWeek[0] && day <= roughWeek[1]) {
      if (moodRand() < 0.4) checkins[day] = { mood: rating(1.6 + moodRand()), energy: rating(1.5 + moodRand()) };
      sleptLastNight = false;
      continue;
    }
    const trend = (i / days) * 0.22;
    const wd = weekday(day);
    const weekend = wd >= 5;
    const log: Record<string, number> = {};
    const chance = (p: number) => rand() < Math.min(0.97, p + trend);

    const slept = chance(weekend ? 0.35 : 0.58);
    if (slept) log[sleep.id] = 1;
    if (chance(weekend ? 0.7 : 0.55)) log[walk.id] = 1;
    log[water.id] = Math.max(0, Math.min(8, Math.round(4 + trend * 12 + (rand() - 0.4) * 6)));
    if ([0, 2, 4].includes(wd) && chance(slept ? 0.62 : 0.4)) log[gym.id] = 1;
    if (wd < 5 && chance(slept ? 0.74 : 0.36)) log[deep.id] = 1;
    if (day >= study.createdOn && chance(weekend ? 0.45 : 0.5)) log[study.id] = 1;
    if (chance(log[deep.id] ? 0.62 : 0.3)) log[plan.id] = 1;

    for (const k of Object.keys(log)) if (log[k] === 0) delete log[k];
    if (Object.keys(log).length) logs[day] = log;

    // Mood lifts with walks and deep work; energy mostly follows last night's sleep.
    if (moodRand() < 0.85) {
      const noise = () => (moodRand() - 0.5) * 1.6;
      const mood = 2.6 + (log[walk.id] ? 0.6 : 0) + (log[deep.id] ? 0.45 : 0) + (log[gym.id] ? 0.3 : 0) + trend * 2 + noise();
      const energy = 2.4 + (sleptLastNight ? 0.9 : 0) + (log[gym.id] ? 0.25 : 0) - (weekend ? 0.2 : 0) + trend * 1.5 + noise();
      checkins[day] = { mood: rating(mood), energy: moodRand() < 0.92 ? rating(energy) : null };
    }
    sleptLastNight = slept;
  }

  return {
    version: 1,
    worldName: 'Sprout Isle',
    habits,
    todos: [
      { id: newId(), name: 'Book dentist appointment', area: null, difficulty: 'easy', createdOn: addDays(today, -30), doneOn: addDays(today, -28) },
      { id: newId(), name: 'Email tutor about project', area: null, difficulty: 'medium', createdOn: addDays(today, -12), doneOn: addDays(today, -11) },
      { id: newId(), name: 'Update CV', area: null, difficulty: 'hard', createdOn: addDays(today, -3), doneOn: null },
    ],
    rewards: [
      { id: newId(), name: 'An episode of my show', cost: 30 },
      { id: newId(), name: 'A nice coffee out', cost: 50 },
      { id: newId(), name: 'Guilt-free gaming evening', cost: 120 },
    ],
    redemptions: [],
    logs,
    quests: {},
    bosses: {},
    companion: { species: 'fox', name: 'Maple', adoptedOn: start },
    purchases: [
      { id: newId(), itemId: 'well', cost: 80, on: addDays(today, -40) },
      { id: newId(), itemId: 'flower-bed', cost: 30, on: addDays(today, -35) },
      { id: newId(), itemId: 'kite', cost: 40, on: addDays(today, -20) },
      { id: newId(), itemId: 'chick', cost: 60, on: addDays(today, -12) },
      { id: newId(), itemId: 'campfire', cost: 45, on: addDays(today, -6) },
    ],
    checkins,
    placements: { 'ground-2': 'well', 'ground-4': 'flower-bed', 'ground-7': 'campfire', 'sky-1': 'kite' },
    isSample: true,
    updatedAt: Date.now(),
  };
}
