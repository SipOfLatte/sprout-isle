import { describe, expect, it } from 'vitest';
import { achievementStatuses, closestToUnlock, type Achievement } from './achievements';
import type { Progress } from './engine';
import { emptyState } from './storage';

const progress = { checkIns: 0 } as Progress;
const state = emptyState();

// Each fake achievement reports a fixed value, so the tests only exercise ranking.
const fake = (id: string, value: number, goal: number): Achievement => ({ id, name: id, description: '', measure: () => value, goal });
const ids = (list: { achievement: Achievement }[]) => list.map((x) => x.achievement.id).join(',');

describe('achievementStatuses', () => {
  it('caps progress at the goal and marks it unlocked', () => {
    const [done, part] = achievementStatuses(progress, state, [fake('done', 12, 10), fake('part', 3, 10)]);
    expect(done).toMatchObject({ value: 10, unlocked: true });
    expect(part).toMatchObject({ value: 3, unlocked: false });
  });
});

describe('closestToUnlock', () => {
  it('ranks locked achievements by fraction done and skips unlocked ones', () => {
    const statuses = achievementStatuses(progress, state, [
      fake('a', 1, 1),
      fake('b', 2, 10),
      fake('c', 5, 7),
      fake('d', 72, 100),
      fake('e', 0, 1),
    ]);
    expect(ids(closestToUnlock(statuses, 3))).toBe('d,c,b');
  });

  it('keeps list order when nothing has started', () => {
    const statuses = achievementStatuses(progress, state, [fake('a', 0, 1), fake('b', 0, 5), fake('c', 0, 3), fake('d', 0, 1)]);
    expect(ids(closestToUnlock(statuses, 3))).toBe('a,b,c');
  });

  it('returns nothing once everything is unlocked', () => {
    expect(closestToUnlock(achievementStatuses(progress, state, [fake('a', 1, 1)]), 3)).toEqual([]);
  });
});
