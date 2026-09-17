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

  for (const [i, day] of range(start, today).entries()) {
    if (day >= roughWeek[0] && day <= roughWeek[1]) continue;
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
  }

  return {
    version: 1,
    worldName: 'Sprout Isle',
    habits,
    todos: [
      { id: newId(), name: 'Book dentist appointment', area: 'health', difficulty: 'easy', createdOn: addDays(today, -30), doneOn: addDays(today, -28) },
      { id: newId(), name: 'Email tutor about project', area: 'work', difficulty: 'medium', createdOn: addDays(today, -12), doneOn: addDays(today, -11) },
      { id: newId(), name: 'Update CV', area: 'work', difficulty: 'hard', createdOn: addDays(today, -3), doneOn: null },
    ],
    rewards: [
      { id: newId(), name: 'An episode of my show', cost: 30 },
      { id: newId(), name: 'A nice coffee out', cost: 50 },
      { id: newId(), name: 'Guilt-free gaming evening', cost: 120 },
    ],
    redemptions: [],
    logs,
    isSample: true,
  };
}
