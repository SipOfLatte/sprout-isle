// Sprites for store items, pets and bosses. Same bitmap format as sprites.ts;
// rows are right-padded, so they don't need to be hand-counted.

import type { Sprite } from './sprites';

function art(...rows: string[]): Sprite {
  const w = Math.max(...rows.map((r) => r.length));
  return { rows: rows.map((r) => r.padEnd(w, '.')) };
}

export const ITEM_ART: Record<string, Sprite> = {
  // Buildings
  well: art('..kkkkk', '.krrrrrk', 'kRRRRRRRk', '..O...O', '..O...O', '.ssssSss', 'sSuuuuuSs', 'sSsSsSsSs', '.sSsSsSs'),
  'market-stall': art('rwrwrwrwrwr', 'RwRwRwRwRwR', '.O.......O', '.O.yy.pp.O', '.OOOOOOOOO', '.OoooooooO', '.OoOoOoOoO', '.OOOOOOOOO', '.O.......O'),
  greenhouse: art('....kkkk', '..kkuuuukk', '.kuuwuuuuuk', 'kuuuuuuwuuuk', 'kkkkkkkkkkkk', 'kGuGuGGuGuGk', 'kgGgGgGgGgGk', 'kGgGgGgGgGgk', 'kkkkkkkkkkkk'),
  bakery: art('........kk', '...kkkkkok', '..koooooook', '.kooooooooook', 'kOOOOOOOOOOk', '.kccccccccck', '.kcyycOOcyyk', '.kcyycOOcyyk', '.kccccOOccck', 'kkkkkkkkkkkk'),
  observatory: art('....kkk', '...knnnk', '..knnwnnk', '.knnnnnnnk', '.kNNNNNNNk', '..ksssssk', '..kssSssk', '..ksssssk', '..kssOssk', '..kssOssk', '.kkkkkkkkk'),
  lighthouse: art('..kkk', '.kyyyk', '.kkkkk', '..krk', '..kwk', '..krk', '.kwwwk', '.krrrk', '.kwwwk', '.krrrk', 'kwwwwwk', 'kkkkkkk'),

  // Decor
  bench: art('OOOOOOOO', 'oooooooo', 'O......O', 'O......O'),
  'flower-bed': art('.p.y.p.y', 'pGyGpGyGp', 'OOOOOOOOO', 'ObObObObO'),
  scarecrow: art('..yyy', '.yyyyy', '..oko', '..ooo', 'yyrrryy', '..rrr', '..rrr', '...O', '...O'),
  campfire: art('...y', '..ymy', '.ymmmy', '..mym', 'bObObOb', 'ObObObO'),
  mailbox: art('nnnn', 'nNNnr', 'nnnn', '..O', '..O', '..O', '.OOO'),
  statue: art('..sss', '..sSs', '...s', '.sssss', 's.sss.s', '..sss', '..s.s', '..s.s', 'SSSSSSS', 'sssssss'),

  // Sky
  kite: art('...p', '..ppp', '.ppwpp', 'ppwwwpp', '.ppwpp', '..ppp', '...p', '...k', '..k', '...k'),
  balloon: art('..rrrrr', '.rrwrrrrr', 'rrrrryrrr', 'rryrrrrrr', 'rrrrrrryr', '.rrrrrrr', '..rrrrr', '...k.k', '...k.k', '...OOO', '...OoO', '...OOO'),
  airship: art('...nnnnnnnn', '.nnNnnnnnnnnn', 'nnnnnwnnwnnnnk', '.nnnnnnnnnnnn', '...nnnnnnnn', '.....k..k', '....OOOOO'),

  // Store pets
  chick: art('..yy', '.yyky', '.yyyyo', 'yyyyy', '.yyyy', '..o.o'),
  bunny: art('.w.w', '.w.w', '.www', 'wwkww', '.wwwwwwq', '.wwwwww', '..w..w'),
  cat: art('k.k', 'kkk....k', 'kyky...k', 'kkkkkkkk', '.kkkkkk', '.k.k.k.k'),
  owl: art('f....f', 'ffffff', 'fwffwf', 'fkfofk', '.fccf', '.fccf', '..o.o'),

  // Boss loot
  'slime-plush': art('..LLL', '.LPPPL', 'LPkPkPL', 'LPPPPPL', '.LLLLL'),
  'ghost-lantern': art('..k', '.kkk', 'kBeBk', 'kebek', 'kBeBk', '.kkk', '..k', '..k', '.kkk'),
  'pebble-golem': art('.SSSS', 'SsksksS', 'SssssS', 'SsSSsS', '.S..S'),
  'kraken-fountain': art('.P.u.P', 'P.uuu.P', '.PuuuP', 'sssssss', 'suuuuus', 'sssssss'),
  'clockwork-gnome': art('..r', '.rrr', 'rrrrr', '.qkq', '.YYY', 'YgYgY', '.YYY', '.k.k'),
  'blue-campfire': art('...w', '..BwB', '.BBwBB', '..BBB', 'bObObOb', 'ObObObO'),
};

// ---- Companions ---------------------------------------------------------------
// Three growth stages each. Stage 2 and 3 add something to the base look.

const sproutBase = ['.aaaaaa.', 'aakaakaa', 'aaaaaaaa', 'aqaaaaqa', '.aaaaaa.', '..A..A..'];
const foxBase = ['O...O', 'OO.OO', 'ooooo', 'okoko', 'woooooooO', '.ooooooOO', '..o..o'];
const frogBase = ['.GG.GG.', 'GwkGwkG', 'GGGGGGG', 'GqGGGqG', 'GGgggGG', '.G...G.'];

export const PET_ART: Record<string, Sprite[]> = {
  sprout: [
    art('...G', '...g', ...sproutBase),
    art('..GG.GG', '...gg', ...sproutBase),
    art('...p', '..pyp', '..GpG', '...g', ...sproutBase),
  ],
  fox: [
    art(...foxBase),
    art(...foxBase.slice(0, 4), 'nnnnn', ...foxBase.slice(4)),
    art('Y.Y.Y', 'YYYYY', ...foxBase.slice(0, 4), 'nnnnn', ...foxBase.slice(4)),
  ],
  frog: [
    art(...frogBase),
    art('.GGGGG', 'GGgggGG', ...frogBase),
    art('.Y.Y.Y', '.YYYYY', ...frogBase),
  ],
};

// ---- Bosses -------------------------------------------------------------------

export const BOSS_ART: Record<string, Sprite> = {
  slime: art(
    '....LLLL',
    '..LLPPPPLL',
    '.LPPPPPPPPL',
    'LPPwkPPwkPPL',
    'LPPkkPPkkPPL',
    'LPPPPPPPPPPL',
    'LPPPkkkkPPPL',
    'LPPPPPPPPPPL',
    '.LPPPPPPPPL',
    'LLLLLLLLLLLL',
  ),
  wraith: art(
    '...eeee',
    '..eeeeeee',
    '.eekeekeee',
    '.eekeekeee',
    'eeeeeeeeeeE',
    'eekkkkeeeeE',
    'eeeeeennkeE',
    'eeeeeenBkeE',
    'eEeeeennkeE',
    'eEeeeeeeeeE',
    'e.eE.eE.eE',
  ),
  golem: art(
    '.........w.w',
    '..SSSSSS..w',
    '.SssssssS.w.w',
    'SskkssskksS',
    'SssssssssS',
    'SsssSSsssS',
    '.SSSSSSSS',
    'SS.SSSS.SS',
    'SS.SSSS.SS',
    'SS.S..S.SS',
  ),
  kraken: art(
    '.P......P',
    'P.P.PP.P.P',
    '..PPPPPP',
    '.PwkPPwkP',
    '.PPPPPPPP',
    'rrrrrrrrrrrr',
    'rRRRRRRRRRRr',
    'rRrrrrrrrrRr',
    'rrrrrrrrrrrr',
    'O.P.P..P.P.O',
  ),
  gremlin: art(
    'g..........g',
    'gg.gggggg.gg',
    '.gggggggggg',
    '..gyggggyg',
    '..gkggggkg',
    '..ggkwkwgg',
    '...gggggg',
    '..gnnnnnng',
    '.g.nnnnnn.g',
    '...g....g',
  ),
  ember: art(
    '.....m',
    '....mym',
    '..m.mym.m',
    '..mmyyymm',
    '.mmyyyyymm',
    '.myykyykym',
    'mmyyyyyyymm',
    'myyykkkyyym',
    'mmyyyyyyymm',
    '.mmmmmmmmm',
  ),
};
