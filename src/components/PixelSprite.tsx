import { useMemo } from 'react';
import { PIXEL, type Sprite } from '../world/sprites';

/** Renders a sprite bitmap as crisp SVG, `scale` screen pixels per sprite pixel. */
export function PixelSprite({ sprite, scale = 4, label, className }: { sprite: Sprite; scale?: number; label?: string; className?: string }) {
  const w = sprite.rows[0]?.length ?? 0;
  const h = sprite.rows.length;
  const rects = useMemo(() => {
    const out: { x: number; y: number; w: number; c: string }[] = [];
    sprite.rows.forEach((row, y) => {
      let x = 0;
      while (x < w) {
        const ch = row[x];
        let run = 1;
        while (x + run < w && row[x + run] === ch) run++;
        if (ch !== '.' && PIXEL[ch]) out.push({ x, y, w: run, c: PIXEL[ch] });
        x += run;
      }
    });
    return out;
  }, [sprite, w]);

  return (
    <svg
      className={className}
      width={w * scale}
      height={h * scale}
      viewBox={`0 0 ${w} ${h}`}
      shapeRendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {rects.map((r) => (
        <rect key={`${r.x}-${r.y}`} x={r.x} y={r.y} width={r.w} height={1} fill={r.c} />
      ))}
    </svg>
  );
}
