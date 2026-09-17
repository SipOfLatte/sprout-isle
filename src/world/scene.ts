// Builds the floating-island scene as a pixel grid, then merges horizontal
// runs of the same colour into rects so the SVG stays small.

import { PET_SPOTS, SLOTS } from '../lib/catalog';
import { ITEM_ART, PET_ART } from './art';
import { PIXEL, SPRITES, type Sprite } from './sprites';
import type { Area } from '../lib/types';

export const W = 160;
export const H = 90;

export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night';

export function skyPhase(hour: number): SkyPhase {
  if (hour >= 5 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 17) return 'day';
  if (hour >= 17 && hour < 21) return 'dusk';
  return 'night';
}

const SKY: Record<SkyPhase, string[]> = {
  dawn: ['#9DBFE3', '#BCD6EC', '#E9D3D0', '#FBD3B4', '#FFE1B8'],
  day: ['#8ECBEB', '#A2D5EF', '#B6DFF3', '#C8E7F5', '#D8EFF8'],
  dusk: ['#6F76B5', '#9483B8', '#C88FB0', '#EFA58F', '#FFC593'],
  night: ['#1B2050', '#212862', '#283171', '#303A7E', '#394489'],
};

export interface Landmark {
  area: Area;
  level: number;
  name: string;
}

export const LANDMARKS: Landmark[] = [
  { area: 'health', level: 1, name: 'Grass tufts' },
  { area: 'health', level: 2, name: 'Wildflowers' },
  { area: 'health', level: 3, name: 'Hedge bush' },
  { area: 'health', level: 4, name: 'Young tree' },
  { area: 'health', level: 5, name: 'Spring pond' },
  { area: 'health', level: 6, name: 'Old oak' },
  { area: 'health', level: 7, name: 'Mushroom ring' },
  { area: 'health', level: 8, name: 'Visiting deer' },
  { area: 'work', level: 1, name: 'Stone path' },
  { area: 'work', level: 2, name: 'Signpost' },
  { area: 'work', level: 3, name: 'Camp tent' },
  { area: 'work', level: 4, name: 'Study cottage' },
  { area: 'work', level: 5, name: 'Lanterns and crates' },
  { area: 'work', level: 6, name: 'Library tower' },
  { area: 'work', level: 7, name: 'Windmill' },
  { area: 'work', level: 8, name: 'Tower banner' },
];

/** Where a seed lands for each area, in scene pixels. */
export const SEED_TARGET: Record<Area, { x: number; y: number }> = {
  health: { x: 48, y: 50 },
  work: { x: 108, y: 50 },
};

type Grid = (string | null)[][];

/** Last row of the grass; the front ledge below the landmarks holds placed items. */
const GROUND_BOTTOM = 68;

function hash(x: number, y: number): number {
  let h = Math.imul(x * 374761393 + y * 668265263, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function put(grid: Grid, x: number, y: number, color: string) {
  if (x >= 0 && x < W && y >= 0 && y < H) grid[y][x] = color;
}

/** Draw a sprite with its bottom-left pixel at (x, bottom). */
function stamp(grid: Grid, sprite: Sprite, x: number, bottom: number) {
  const top = bottom - sprite.rows.length + 1;
  sprite.rows.forEach((row, dy) => {
    [...row].forEach((ch, dx) => {
      if (ch !== '.') put(grid, x + dx, top + dy, PIXEL[ch]);
    });
  });
}

function paintSky(grid: Grid, phase: SkyPhase) {
  const bands = SKY[phase];
  const bandH = H / bands.length;
  for (let y = 0; y < H; y++) {
    const pos = y / bandH;
    const i = Math.floor(pos);
    const frac = pos - i;
    for (let x = 0; x < W; x++) {
      // Checkerboard dither in the last two rows of each band.
      const dither = frac > 1 - 2 / bandH && (x + y) % 2 === 0 && i + 1 < bands.length;
      grid[y][x] = bands[dither ? i + 1 : i];
    }
  }

  if (phase === 'night') {
    for (let i = 0; i < 40; i++) {
      const x = Math.floor(hash(i, 7) * W);
      const y = Math.floor(hash(i, 13) * 44);
      put(grid, x, y, i % 5 === 0 ? '#FFE9A8' : '#DDE3FF');
    }
    disc(grid, 132, 28, 5, '#F2F0FF');
    disc(grid, 134, 26, 4, SKY.night[0]);
  } else {
    const sun = { dawn: [30, 36, '#FFB86B'], day: [132, 28, '#FFD166'], dusk: [132, 34, '#FF9E6B'] }[phase] as [number, number, string];
    disc(grid, sun[0], sun[1], 6, sun[2]);
  }

  const cloud = phase === 'night' ? '#4A5494' : '#FFFFFF';
  for (const [cx, cy] of [[10, 22], [92, 9], [60, 30], [14, 74], [126, 80]]) {
    SPRITES.cloud.rows.forEach((row, dy) =>
      [...row].forEach((ch, dx) => ch !== '.' && put(grid, cx + dx, cy + dy, cloud)),
    );
  }
}

function disc(grid: Grid, cx: number, cy: number, r: number, color: string) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) put(grid, cx + x, cy + y, color);
}

function paintIsland(grid: Grid) {
  const grass = ['#8CCB5E', '#7DBE52'];
  for (let y = 48; y <= GROUND_BOTTOM; y++) {
    const inset = y === 48 ? 8 : y === 49 ? 3 : 0;
    for (let x = 24 + inset; x <= 136 - inset; x++) {
      const edge = y === GROUND_BOTTOM || x === 24 + inset || x === 136 - inset;
      put(grid, x, y, edge ? '#5E9E48' : grass[hash(x, y) > 0.82 ? 1 : 0]);
    }
  }
  for (let y = GROUND_BOTTOM + 1; y < H; y++) {
    const half = 56 - (y - GROUND_BOTTOM - 1) * 2.7 - hash(0, y) * 3;
    if (half < 2) break;
    for (let x = Math.round(80 - half); x <= Math.round(80 + half); x++) {
      const n = hash(x, y);
      const edge = Math.abs(x - 80) > half - 1.5;
      put(grid, x, y, edge ? '#6E5A73' : n > 0.9 ? '#8E8AA8' : n > 0.55 ? '#A57A56' : '#BD8F62');
    }
  }
}

interface Placement {
  sprite: Sprite;
  x: number;
  bottom: number;
  area: Area;
  level: number;
}

const PLACEMENTS: Placement[] = [
  // Back row (bottom 51)
  { sprite: SPRITES.smallTree, x: 26, bottom: 51, area: 'health', level: 4 },
  { sprite: SPRITES.bush, x: 34, bottom: 51, area: 'health', level: 3 },
  { sprite: SPRITES.bigTree, x: 56, bottom: 51, area: 'health', level: 6 },
  { sprite: SPRITES.smallTree, x: 68, bottom: 51, area: 'health', level: 7 },
  { sprite: SPRITES.tent, x: 84, bottom: 51, area: 'work', level: 3 },
  { sprite: SPRITES.cottage, x: 96, bottom: 51, area: 'work', level: 4 },
  { sprite: SPRITES.tower, x: 111, bottom: 51, area: 'work', level: 6 },
  { sprite: SPRITES.flag, x: 116, bottom: 30, area: 'work', level: 8 },
  { sprite: SPRITES.windmillBody, x: 125, bottom: 51, area: 'work', level: 7 },
  // Middle
  { sprite: SPRITES.pond, x: 40, bottom: 55, area: 'health', level: 5 },
  { sprite: SPRITES.signpost, x: 76, bottom: 54, area: 'work', level: 2 },
  { sprite: SPRITES.crates, x: 108, bottom: 55, area: 'work', level: 5 },
  { sprite: SPRITES.lantern, x: 121, bottom: 55, area: 'work', level: 5 },
  // Front row
  { sprite: SPRITES.tuft, x: 31, bottom: 55, area: 'health', level: 1 },
  { sprite: SPRITES.tuft, x: 57, bottom: 54, area: 'health', level: 1 },
  { sprite: SPRITES.tuft, x: 70, bottom: 55, area: 'health', level: 1 },
  { sprite: SPRITES.flowerPink, x: 36, bottom: 55, area: 'health', level: 2 },
  { sprite: SPRITES.flowerYellow, x: 62, bottom: 55, area: 'health', level: 2 },
  { sprite: SPRITES.flowerPink, x: 73, bottom: 54, area: 'health', level: 2 },
  { sprite: SPRITES.mushrooms, x: 24, bottom: 55, area: 'health', level: 7 },
  { sprite: SPRITES.deer, x: 62, bottom: 55, area: 'health', level: 8 },
  { sprite: SPRITES.bird, x: 60, bottom: 40, area: 'health', level: 8 },
];

function paintPath(grid: Grid) {
  for (const [x, y] of [[80, 54], [83, 53], [86, 54], [89, 53], [92, 54], [95, 53], [99, 54], [102, 53]]) {
    put(grid, x, y, '#B9BBD0');
    put(grid, x + 1, y, '#B9BBD0');
    put(grid, x, y + 1, '#8A8DA8');
    put(grid, x + 1, y + 1, '#8A8DA8');
  }
}

function paintSails(grid: Grid) {
  const cx = 129;
  const cy = 43;
  for (let i = -7; i <= 7; i++) {
    if (Math.abs(i) < 1) continue;
    put(grid, cx + i, cy + i, '#E3AE6E');
    put(grid, cx + i, cy - i, '#E3AE6E');
  }
  put(grid, cx, cy, '#2B2D52');
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  c: string;
}

export interface Decorations {
  /** slotId -> itemId, already filtered to items the player owns. */
  placements: Record<string, string>;
  /** Companion (species + stage) first, then store pets by item id. */
  pets: { art: string; stage?: number }[];
}

export function buildScene(levels: Record<Area, number>, phase: SkyPhase, deco: Decorations = { placements: {}, pets: [] }): Rect[] {
  const grid: Grid = Array.from({ length: H }, () => Array<string | null>(W).fill(null));
  paintSky(grid, phase);

  // Sky items sit behind the island.
  for (const slot of SLOTS.filter((s) => s.kind === 'sky')) {
    const art = ITEM_ART[deco.placements[slot.id] ?? ''];
    if (art) stamp(grid, art, slot.x, slot.bottom);
  }

  paintIsland(grid);
  if (levels.work >= 1) paintPath(grid);

  const layers: { sprite: Sprite; x: number; bottom: number }[] = PLACEMENTS.filter((p) => levels[p.area] >= p.level);
  deco.pets.slice(0, PET_SPOTS.length).forEach((pet, i) => {
    const sprite = pet.stage !== undefined ? PET_ART[pet.art]?.[pet.stage] : ITEM_ART[pet.art];
    if (sprite) layers.push({ sprite, ...PET_SPOTS[i] });
  });
  for (const slot of SLOTS.filter((s) => s.kind === 'ground')) {
    const art = ITEM_ART[deco.placements[slot.id] ?? ''];
    // Centre narrower items in their 12px slot.
    if (art) layers.push({ sprite: art, x: slot.x + Math.max(0, Math.floor((12 - art.rows[0].length) / 2)), bottom: slot.bottom });
  }
  for (const layer of layers.sort((a, b) => a.bottom - b.bottom)) stamp(grid, layer.sprite, layer.x, layer.bottom);
  if (levels.work >= 7) paintSails(grid);

  const rects: Rect[] = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      const c = grid[y][x];
      let w = 1;
      while (x + w < W && grid[y][x + w] === c) w++;
      if (c) rects.push({ x, y, w, c });
      x += w;
    }
  }
  return rects;
}
