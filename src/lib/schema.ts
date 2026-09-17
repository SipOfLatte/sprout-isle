// Anything read from storage or an imported backup is untrusted: it's parsed
// against this schema, with size limits, before it reaches the app.

import { z } from 'zod';
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

export const MAX_HABITS = 100;
export const LIMITS = { importBytes: 5_000_000 };

export const stateSchema = z.object({
  version: z.literal(1),
  worldName: z.string().trim().min(1).max(40),
  habits: z
    .array(
      z.object({
        id,
        name,
        area,
        schedule,
        target: z.number().int().min(1).max(10_000),
        unit: z.string().trim().max(20),
        difficulty,
        createdOn: dateKey,
        archivedOn: dateKey.nullable(),
      }),
    )
    .max(MAX_HABITS),
  todos: z
    .array(z.object({ id, name, area, difficulty, createdOn: dateKey, doneOn: dateKey.nullable() }))
    .max(5_000),
  rewards: z.array(z.object({ id, name, cost: z.number().int().min(1).max(100_000) })).max(200),
  redemptions: z
    .array(z.object({ id, rewardId: id, name, cost: z.number().int().min(1).max(100_000), on: dateKey }))
    .max(10_000),
  logs: z.record(dateKey, z.record(id, z.number().int().min(0).max(10_000))),
  isSample: z.boolean(),
});

export function parseState(input: unknown): AppState | null {
  const result = stateSchema.safeParse(input);
  return result.success ? (result.data as AppState) : null;
}
