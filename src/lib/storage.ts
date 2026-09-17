// Loads and saves app state in localStorage and creates the starting state for new players.

import { parseState } from './schema';
import type { AppState } from './types';

const KEY = 'sprout-isle/state/v1';

/** Random UUIDs, so ids can't be guessed or collide across synced devices. */
export function newId(): string {
  return crypto.randomUUID();
}

export function emptyState(): AppState {
  return {
    version: 1,
    worldName: 'Sprout Isle',
    habits: [],
    todos: [],
    rewards: [
      { id: newId(), name: 'An episode of my show', cost: 30 },
      { id: newId(), name: 'A nice coffee out', cost: 50 },
      { id: newId(), name: 'Guilt-free gaming evening', cost: 120 },
    ],
    redemptions: [],
    logs: {},
    quests: {},
    bosses: {},
    companion: null,
    purchases: [],
    placements: {},
    checkins: {},
    isSample: false,
    updatedAt: 0,
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyState();
    let parsed: AppState | null = null;
    try {
      parsed = parseState(JSON.parse(raw));
    } catch {
      parsed = null;
    }
    if (parsed) return parsed;
    // Keep unreadable data aside instead of overwriting it on the next save.
    localStorage.setItem(`${KEY}/unreadable-${Date.now()}`, raw);
    return emptyState();
  } catch {
    return emptyState();
  }
}

/** Returns false when the browser refuses to store (private mode, quota full). */
export function saveState(state: AppState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
