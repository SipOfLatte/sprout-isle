// Reordering a list you can only partly see. Today shows a filtered slice of
// habits (only the ones due), so a drag reorders that slice and every hidden
// item keeps its place in the full list.

export function reorderSubset<T extends { id: string }>(all: T[], orderedIds: string[]): T[] {
  const byId = new Map(all.map((item) => [item.id, item]));
  const moved = orderedIds.map((id) => byId.get(id)).filter((item): item is T => item !== undefined);
  const movedIds = new Set(moved.map((item) => item.id));
  if (moved.length !== orderedIds.length) return all;

  // Walk the full list and fill each slot that belonged to the slice with the next item in the new order.
  let next = 0;
  return all.map((item) => (movedIds.has(item.id) ? moved[next++] : item));
}
