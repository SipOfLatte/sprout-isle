// Anything read from storage or an imported backup is untrusted: it's parsed
// against this schema, with size limits, before it reaches the app.

import { z } from 'zod';
import { MAX_TRASH } from './trash';
import type { AppState } from './types';

const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const id = z.string().min(1).max(64).regex(/^[A-Za-z0-9-]+$/);
const name = z.string().trim().min(1).max(80);
const area = z.enum(['health', 'work']);
const difficulty = z.enum(['easy', 'medium', 'hard']);

const schedule = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('daily') }),
  z.object({ kind: z.literal('weekdays'), days: z.array(z.number().int().min(0).max(6)).min(1).max(7) }),
  z.object({ kind: z.literal('weekly'), times: z.number().int().min(1).max(7) }),
]);

const quest = z.object({
  id: z.string().min(1).max(64).regex(/^[A-Za-z0-9-]+$/),
  kind: z.enum(['habit', 'perfect', 'area', 'total', 'todos']),
  target: z.number().int().min(1).max(10_000),
  xp: z.number().int().min(1).max(1_000),
  habitId: id.optional(),
  habitName: name.optional(),
  area: area.optional(),
});

const habit = z.object({
  id,
  name,
  area,
  schedule,
  target: z.number().int().min(1).max(10_000),
  unit: z.string().trim().max(20),
  difficulty,
  createdOn: dateKey,
  archivedOn: dateKey.nullable(),
});

const todo = z.object({ id, name, area: area.nullable().default(null), difficulty, createdOn: dateKey, doneOn: dateKey.nullable() });

const position = z.number().int().min(0).max(10_000);

const trash = z.object({
  habits: z
    .array(z.object({ habit, logs: z.record(dateKey, z.number().int().min(0).max(10_000)), deletedOn: dateKey, index: position }))
    .max(MAX_TRASH.habits),
  todos: z.array(z.object({ todo, deletedOn: dateKey, index: position })).max(MAX_TRASH.todos),
});

const slug = z.string().min(1).max(40).regex(/^[a-z0-9-]+$/);

export const MAX_HABITS = 100;
export const LIMITS = { importBytes: 5_000_000 };

export const stateSchema = z.object({
  version: z.literal(1),
  worldName: z.string().trim().min(1).max(40),
  habits: z.array(habit).max(MAX_HABITS),
  todos: z.array(todo).max(5_000),
  rewards: z.array(z.object({ id, name, cost: z.number().int().min(1).max(100_000) })).max(200),
  redemptions: z
    .array(z.object({ id, rewardId: id, name, cost: z.number().int().min(1).max(100_000), on: dateKey }))
    .max(10_000),
  logs: z.record(dateKey, z.record(id, z.number().int().min(0).max(10_000))),
  // Defaults keep v1 backups importable.
  quests: z.record(dateKey, z.array(quest).max(5)).default({}),
  bosses: z
    .record(dateKey, z.object({ kind: z.enum(['slime', 'wraith', 'golem', 'kraken', 'gremlin', 'ember']), hp: z.number().int().min(1).max(10_000) }))
    .default({}),
  companion: z
    .object({ species: z.enum(['sprout', 'fox', 'frog']), name: z.string().trim().min(1).max(20), adoptedOn: dateKey })
    .nullable()
    .default(null),
  purchases: z.array(z.object({ id, itemId: slug, cost: z.number().int().min(0).max(100_000), on: dateKey })).max(1_000).default([]),
  placements: z.record(slug, slug).default({}),
  checkins: z
    .record(dateKey, z.object({ mood: z.number().int().min(1).max(5).nullable(), energy: z.number().int().min(1).max(5).nullable() }))
    .default({}),
  trash: trash.default({ habits: [], todos: [] }),
  isSample: z.boolean(),
  updatedAt: z.number().int().min(0).default(0),
});

export function parseState(input: unknown): AppState | null {
  const result = stateSchema.safeParse(input);
  return result.success ? (result.data as AppState) : null;
}
