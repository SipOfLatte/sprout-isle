// Everything that can live on the island besides the landmarks you grow:
// store items, boss loot, and the slots they can be placed in.

import type { BossKind, Species } from './types';

export type ItemKind = 'building' | 'decor' | 'sky' | 'pet';

export interface CatalogItem {
  id: string;
  name: string;
  kind: ItemKind;
  /** Coin price, or null for boss loot that can't be bought. */
  price: number | null;
  description: string;
  /** Player level needed before it appears for sale. */
  level: number;
}

export const CATALOG: CatalogItem[] = [
  { id: 'bench', name: 'Bench', kind: 'decor', price: 25, level: 1, description: 'Somewhere to sit and admire the view.' },
  { id: 'flower-bed', name: 'Flower bed', kind: 'decor', price: 30, level: 1, description: 'A tidy row of blooms.' },
  { id: 'mailbox', name: 'Mailbox', kind: 'decor', price: 30, level: 1, description: 'For letters from your future self.' },
  { id: 'campfire', name: 'Campfire', kind: 'decor', price: 45, level: 2, description: 'Warm, crackly, good for stories.' },
  { id: 'scarecrow', name: 'Scarecrow', kind: 'decor', price: 55, level: 3, description: 'Keeps the crows off the flowers.' },
  { id: 'statue', name: 'Stone statue', kind: 'decor', price: 110, level: 5, description: 'A monument to showing up.' },

  { id: 'well', name: 'Wishing well', kind: 'building', price: 80, level: 2, description: 'Toss in a coin and a small intention.' },
  { id: 'market-stall', name: 'Market stall', kind: 'building', price: 120, level: 3, description: 'Fresh fruit, fair prices.' },
  { id: 'greenhouse', name: 'Greenhouse', kind: 'building', price: 180, level: 4, description: 'Where slow progress grows.' },
  { id: 'bakery', name: 'Bakery', kind: 'building', price: 220, level: 5, description: 'Smells like a good morning.' },
  { id: 'observatory', name: 'Observatory', kind: 'building', price: 300, level: 7, description: 'For looking at the big picture.' },
  { id: 'lighthouse', name: 'Lighthouse', kind: 'building', price: 400, level: 9, description: 'Guides you home after a rough week.' },

  { id: 'kite', name: 'Kite', kind: 'sky', price: 40, level: 1, description: 'Catches the breeze above the island.' },
  { id: 'balloon', name: 'Hot-air balloon', kind: 'sky', price: 200, level: 5, description: 'A slow drift past the clouds.' },
  { id: 'airship', name: 'Airship', kind: 'sky', price: 450, level: 10, description: 'The island has arrived.' },

  { id: 'chick', name: 'Chick', kind: 'pet', price: 60, level: 1, description: 'Small, loud, supportive.' },
  { id: 'bunny', name: 'Bunny', kind: 'pet', price: 100, level: 3, description: 'Hops about the meadow.' },
  { id: 'cat', name: 'Cat', kind: 'pet', price: 150, level: 4, description: 'Judges gently. Naps a lot.' },
  { id: 'owl', name: 'Owl', kind: 'pet', price: 200, level: 6, description: 'Keeps you company on late study nights.' },

  { id: 'slime-plush', name: 'Slime plushie', kind: 'decor', price: null, level: 1, description: 'Loot from the Procrastination Slime.' },
  { id: 'ghost-lantern', name: 'Ghost lantern', kind: 'decor', price: null, level: 1, description: 'Loot from the Doomscroll Wraith.' },
  { id: 'pebble-golem', name: 'Pebble golem', kind: 'decor', price: null, level: 1, description: 'Loot from the Snooze Golem.' },
  { id: 'kraken-fountain', name: 'Kraken fountain', kind: 'decor', price: null, level: 1, description: 'Loot from the Couch Kraken.' },
  { id: 'clockwork-gnome', name: 'Clockwork gnome', kind: 'decor', price: null, level: 1, description: 'Loot from the Chaos Gremlin.' },
  { id: 'blue-campfire', name: 'Blue campfire', kind: 'decor', price: null, level: 1, description: 'Loot from the Burnout Ember.' },
];

export const ITEMS_BY_ID = new Map(CATALOG.map((i) => [i.id, i]));

export interface BossInfo {
  kind: BossKind;
  name: string;
  taunt: string;
  defeat: string;
  loot: string;
}

export const BOSSES: Record<BossKind, BossInfo> = {
  slime: { kind: 'slime', name: 'The Procrastination Slime', taunt: "Why not tomorrow? Tomorrow's lovely.", defeat: 'The slime melts into a puddle of done.', loot: 'slime-plush' },
  wraith: { kind: 'wraith', name: 'The Doomscroll Wraith', taunt: 'Just one more scroll…', defeat: 'The wraith logs off for good.', loot: 'ghost-lantern' },
  golem: { kind: 'golem', name: 'The Snooze Golem', taunt: 'Five more minutes. Or fifty.', defeat: 'The golem crumbles, fully rested.', loot: 'pebble-golem' },
  kraken: { kind: 'kraken', name: 'The Couch Kraken', taunt: 'Stay. The couch is so comfy.', defeat: 'The kraken lets go of the cushions.', loot: 'kraken-fountain' },
  gremlin: { kind: 'gremlin', name: 'The Chaos Gremlin', taunt: 'Plans? I love eating plans.', defeat: 'The gremlin winds down like a clock.', loot: 'clockwork-gnome' },
  ember: { kind: 'ember', name: 'The Burnout Ember', taunt: "Do everything at once. What could go wrong?", defeat: 'The ember cools into a calm blue glow.', loot: 'blue-campfire' },
};

export const SPECIES: Record<Species, { name: string; blurb: string }> = {
  sprout: { name: 'Sprout spirit', blurb: 'A gentle forest spirit. Grows a flower as it matures.' },
  fox: { name: 'Fox', blurb: 'Curious and loyal. Earns a scarf, then a crown.' },
  frog: { name: 'Frog', blurb: 'Calm and patient. Wears a lily pad hat when grown.' },
};

// ---- Placement slots ----------------------------------------------------------

export type SlotKind = 'ground' | 'sky';

export interface Slot {
  id: string;
  kind: SlotKind;
  /** Scene pixels: left edge and bottom row. */
  x: number;
  bottom: number;
  label: string;
}

export const SLOTS: Slot[] = [
  ...[26, 39, 52, 65, 78, 91, 104, 117].map((x, i) => ({
    id: `ground-${i + 1}`,
    kind: 'ground' as const,
    x,
    bottom: 66,
    label: 'front ledge',
  })),
  { id: 'sky-1', kind: 'sky', x: 18, bottom: 40, label: 'sky, left' },
  { id: 'sky-2', kind: 'sky', x: 56, bottom: 30, label: 'sky, middle' },
  { id: 'sky-3', kind: 'sky', x: 92, bottom: 36, label: 'sky, right' },
];

export function slotAccepts(slot: Slot, kind: ItemKind): boolean {
  if (kind === 'pet') return false;
  return slot.kind === 'sky' ? kind === 'sky' : kind !== 'sky';
}

/** Where companions and store pets stand on the ledge. */
export const PET_SPOTS = [
  { x: 60, bottom: 62 },
  { x: 34, bottom: 61 },
  { x: 86, bottom: 61 },
  { x: 110, bottom: 62 },
  { x: 126, bottom: 61 },
];
