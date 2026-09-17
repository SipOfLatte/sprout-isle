// Pixel icons drawn from tiny bitmaps in currentColor.

const ICONS = {
  check: ['......x', '.....xx', 'x...xx.', 'xx.xx..', '.xxx...', '..x....'],
  plus: ['..x..', '..x..', 'xxxxx', '..x..', '..x..'],
  minus: ['.....', '.....', 'xxxxx', '.....', '.....'],
  pencil: ['.....xx', '....x.x', '...x.x.', '..x.x..', '.x.x...', 'xxx....', 'xx.....'],
  coin: ['..xxx..', '.x...x.', 'x..x..x', 'x..x..x', 'x..x..x', '.x...x.', '..xxx..'],
  flame: ['...x...', '..xx...', '..xxx..', '.xx.xx.', '.x...x.', '.x...x.', '..xxx..'],
  freeze: ['x..x..x', '.x.x.x.', '..xxx..', 'xxx.xxx', '..xxx..', '.x.x.x.', 'x..x..x'],
  left: ['...x', '..x.', '.x..', 'x...', '.x..', '..x.', '...x'],
  right: ['x...', '.x..', '..x.', '...x', '..x.', '.x..', 'x...'],
  leaf: ['....xxx', '..xxxxx', '.xxx.xx', '.xx.xxx', '.x.xxx.', 'x.xx...', 'x......'],
  book: ['.xx.xx.', 'x..x..x', 'x..x..x', 'x..x..x', 'xxxxxxx'],
  star: ['...x...', '..xxx..', 'xxxxxxx', '.xxxxx.', '..xxx..', '.xx.xx.', '.x...x.'],
  trash: ['..xxx..', 'xxxxxxx', '.x.x.x.', '.x.x.x.', '.x.x.x.', '.xxxxx.'],
  gift: ['.x.x.x.', '..xxx..', 'xxxxxxx', 'x..x..x', 'xxxxxxx', 'x..x..x', 'xxxxxxx'],
  chart: ['......x', '....x.x', '..x.x.x', 'x.x.x.x', 'xxxxxxx'],
  isle: ['..x....', '.xxx...', 'xxxxxxx', '.xxxxx.', '..xxx..', '...x...'],
  person: ['..xxx..', '..xxx..', '...x...', '.xxxxx.', '...x...', '..x.x..', '.x...x.'],
  sun: ['...x...', '.x...x.', '..xxx..', 'x.xxx.x', '..xxx..', '.x...x.', '...x...'],
  close: ['x...x', '.x.x.', '..x..', '.x.x.', 'x...x'],
  calendar: ['.x...x.', 'xxxxxxx', 'x.....x', 'x.x.x.x', 'x.....x', 'x.x.x.x', 'xxxxxxx'],
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 16, title }: { name: IconName; size?: number; title?: string }) {
  const rows = ICONS[name];
  const w = rows[0].length;
  const h = rows.length;
  const rects: { x: number; y: number; w: number }[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < w) {
      if (row[x] !== 'x') {
        x++;
        continue;
      }
      let run = 1;
      while (row[x + run] === 'x') run++;
      rects.push({ x, y, w: run });
      x += run;
    }
  });
  const scale = size / Math.max(w, h);
  return (
    <svg
      className="icon"
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title && <title>{title}</title>}
      {rects.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill="currentColor" />
      ))}
    </svg>
  );
}
