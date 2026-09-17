// Sync is last-writer-wins at the level of the whole dataset, with explicit
// conflict detection. `syncedAt` is the updatedAt of the last version both
// this device and the gist agreed on.

export type SyncDecision = 'none' | 'push' | 'pull' | 'conflict';

export function decide(localUpdatedAt: number, remoteUpdatedAt: number | null, syncedAt: number): SyncDecision {
  if (remoteUpdatedAt === null) return 'push';
  if (localUpdatedAt === remoteUpdatedAt) return 'none';
  const localChanged = localUpdatedAt > syncedAt;
  const remoteChanged = remoteUpdatedAt > syncedAt;
  if (localChanged && remoteChanged) return 'conflict';
  if (localChanged) return 'push';
  if (remoteChanged) return 'pull';
  return 'none';
}
