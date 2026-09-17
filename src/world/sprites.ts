// Hand-placed pixel sprites. Each character maps to a palette colour; '.' is
// transparent. Rows must all be the same width.

export const PIXEL: Record<string, string> = {
  k: '#2B2D52', // ink outline
  d: '#3F7A3A', // leaf shadow
  g: '#5E9E48', // leaf
  G: '#8CCB5E', // leaf light
  b: '#7A5238', // bark
  p: '#F28FAD', // petal pink
  y: '#FFD166', // petal yellow / light
  w: '#FFFFFF',
  u: '#7CCBEB', // water
  U: '#4A97CF', // deep water
  s: '#B9BBD0', // stone
  S: '#8A8DA8', // stone shadow
  n: '#4F7FD9', // lapis
  N: '#3A5FAE', // lapis shadow
  r: '#E07A55', // roof
  R: '#B5573C', // roof shadow
  c: '#F4EEDF', // plaster
  o: '#E3AE6E', // wood light
  O: '#A8733F', // wood
  l: '#FFE08A', // lit window
  f: '#C08552', // fur
  m: '#E4574B', // mushroom cap
  P: '#7B5CC9', // slime purple
  L: '#B7A2F0', // slime light
  a: '#6FD3B8', // spirit aqua
  A: '#3FA98C', // spirit shadow
  Y: '#F2C94C', // gold
  q: '#F7A8B8', // cheek pink
  B: '#5B87DC', // cool flame
  e: '#E9EEF7', // ghost
  E: '#AEB6CF', // ghost shadow
};

export interface Sprite {
  rows: string[];
}

const s = (...rows: string[]): Sprite => ({ rows });

export const SPRITES = {
  tuft: s('G.G', 'gGg'),
  flowerPink: s('.p.', 'pyp', '.g.'),
  flowerYellow: s('.y.', 'ywy', '.g.'),
  bush: s(
    '..ddddd..',
    '.dGGgGGd.',
    'dGgGGGgGd',
    'dgGgGgGgd',
    '.ddddddd.',
  ),
  smallTree: s(
    '..ddd..',
    '.dGGGd.',
    'dGGGgGd',
    'dGgGGGd',
    'dgGGgGd',
    'dggGggd',
    '.ddgdd.',
    '...b...',
    '...b...',
    '..bbb..',
  ),
  bigTree: s(
    '...ddddd...',
    '..dGGGGGd..',
    '.dGGgGGGGd.',
    'dGGGGGgGGGd',
    'dGgGGGGGgGd',
    'dGGGgGGGGGd',
    'dgGGGGgGGgd',
    'dggGgGGGggd',
    '.dgggggggd.',
    '..dddbddd..',
    '.....b.....',
    '.....b.....',
    '....bbb....',
    '...bb.bb...',
  ),
  pond: s(
    '...ssssssss...',
    '.ssuuuuuuuuss.',
    'suuwuuuuuuUuus',
    'sUuuuuUuuuuuUs',
    '.ssUUUUUUUUss.',
    '...ssssssss...',
  ),
  mushrooms: s('.m...m.', 'mmm.mmm', '.w...w.'),
  deer: s(
    'f.f......',
    '.f.......',
    '.ff......',
    'fkf......',
    '.fffffff.',
    '..ffffff.',
    '..f.f.f.f',
    '..f.f.f.f',
  ),
  bird: s('k.k', '.k.'),

  signpost: s('.OOOOO.', 'OoooooO', '.OOOOO.', '...O...', '...O...', '..OOO..'),
  tent: s(
    '.....k.....',
    '....knk....',
    '...knnnk...',
    '..knnNnnk..',
    '.knnNkNnnk.',
    'knnNkkkNnnk',
    'knnNkkkNnnk',
    'kkkkkkkkkkk',
  ),
  cottage: s(
    '....kkkkk....',
    '...krrrrrk...',
    '..krrrrrrrk..',
    '.krrrrrrrrrk.',
    'kRRRRRRRRRRRk',
    '.kccccccccck.',
    '.kcllcOOcllk.',
    '.kcllcOOcllk.',
    '.kccccOOccck.',
    '.kccccOoccck.',
    'kkkkkkkkkkkkk',
  ),
  lantern: s('kyk', 'yly', 'kyk', '.k.', '.k.', '.k.', 'kkk'),
  crates: s('OOOO..', 'OooO..', 'OOOOOO', 'OooOoO', 'OOOOOO'),
  tower: s(
    '.....k.....',
    '....knk....',
    '...knnnk...',
    '..knnNnnk..',
    '.knnNNNnnk.',
    'kkkkkkkkkkk',
    '.ksssssssk.',
    '.kssllsssk.',
    '.kssllsssk.',
    '.kSsssssSk.',
    '.ksssssssk.',
    '.ksSsssSsk.',
    '.kssssllsk.',
    '.kssssllsk.',
    '.ksssssssk.',
    '.kSsssssSk.',
    '.ksssssssk.',
    '.kssOOOssk.',
    '.kssOOOssk.',
    '.kssOoOssk.',
    'kkkkkkkkkkk',
  ),
  windmillBody: s(
    '...kkk...',
    '..krrrk..',
    '.kccccck.',
    '.kccccck.',
    '.kcclcck.',
    '.kccccck.',
    'kccccccck',
    'kccccccck',
    'kcccOccck',
    'kcccOccck',
    'kkkkkkkkk',
  ),
  flag: s('knnn.', 'knnnn', 'knnn.', 'k....', 'k....'),
  cloud: s(
    '....wwww.....',
    '..wwwwwwww...',
    '.wwwwwwwwwww.',
    'wwwwwwwwwwwww',
  ),
} satisfies Record<string, Sprite>;
