// Shared chart pieces: responsive width, tooltips, legends, the card with its table toggle, and bar shapes.

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';

export const pct = (v: number | null | undefined) => (v === null || v === undefined ? 'n/a' : `${Math.round(v * 100)}%`);

/** Tracks an element's content width for responsive SVG charts. */
export function useWidth<T extends HTMLElement>(fallback = 600) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(240, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

export interface TipRow {
  value: string;
  label: string;
  /** CSS colour for the short line key. */
  key?: string;
}

export interface TipState {
  x: number;
  y: number;
  title: string;
  rows: TipRow[];
  align: 'center' | 'left' | 'right';
}

/** One tooltip per chart; positions are relative to the chart wrapper. */
/** Positions one tooltip per chart relative to its wrapper, and flips it near the edges so it stays on screen. */
export function useTooltip() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState | null>(null);

  const show = useCallback((target: Element, title: string, rows: TipRow[]) => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const a = wrap.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const x = b.left - a.left + b.width / 2;
    // Keep the tooltip inside the chart near its edges.
    const align = x > a.width * 0.66 ? 'left' : x < a.width * 0.33 ? 'right' : 'center';
    setTip({ x, y: b.top - a.top, title, rows, align });
  }, []);

  const hide = useCallback(() => setTip(null), []);

  const node = tip && (
    <div
      className={`tip${tip.align === 'center' ? '' : ` tip--${tip.align}`}`}
      style={{ left: tip.x, top: tip.y }}
      role="presentation"
    >
      <div className="tip__title">{tip.title}</div>
      {tip.rows.map((r) => (
        <div className="tip__row" key={r.label}>
          {r.key && <span className="tip__key" style={{ background: r.key }} />}
          <strong>{r.value}</strong>
          <span>{r.label}</span>
        </div>
      ))}
    </div>
  );

  return { wrapRef, show, hide, node };
}

export function Legend({ items }: { items: { label: string; color: string; shape?: 'rect' | 'line' }[] }) {
  return (
    <ul className="legend">
      {items.map((i) => (
        <li key={i.label}>
          <span className={`legend__key legend__key--${i.shape ?? 'rect'}`} style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

/** Card around every chart, with a toggle to show the same data as a table. */
export function ChartCard({
  title,
  description,
  legend,
  table,
  children,
  wide,
}: {
  title: string;
  description?: ReactNode;
  legend?: ReactNode;
  table: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const [showTable, setShowTable] = useState(false);
  const id = useId();
  return (
    <section className={`chart-card${wide ? ' chart-card--wide' : ''}`} aria-labelledby={id}>
      <header className="chart-card__head">
        <div>
          <h3 id={id}>{title}</h3>
          {description && <p className="chart-card__desc">{description}</p>}
        </div>
        <button type="button" className="btn btn--tiny" aria-pressed={showTable} onClick={() => setShowTable((s) => !s)}>
          {showTable ? 'Show chart' : 'Show table'}
        </button>
      </header>
      {!showTable && legend}
      {showTable ? <div className="table-wrap">{table}</div> : children}
    </section>
  );
}

export function EmptyChart({ children }: { children: ReactNode }) {
  return <p className="chart-empty">{children}</p>;
}

/** A column path with a 4px rounded top and a square base. */
export function columnPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (h <= 0) return '';
  const rr = Math.min(r, w / 2, h);
  return `M${x},${y + h}V${y + rr}Q${x},${y} ${x + rr},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h}Z`;
}

/** A horizontal bar with a 4px rounded end. */
export function barPath(x: number, y: number, w: number, h: number, r = 4): string {
  if (w <= 0) return '';
  const rr = Math.min(r, h / 2, w);
  return `M${x},${y}H${x + w - rr}Q${x + w},${y} ${x + w},${y + rr}V${y + h - rr}Q${x + w},${y + h} ${x + w - rr},${y + h}H${x}Z`;
}

export function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
