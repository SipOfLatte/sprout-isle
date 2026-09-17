// Stacked columns of XP per day, split into Health, Work and bonuses.

import { scaleBand, scaleLinear } from 'd3-scale';
import { formatShort, fromKey, WEEKDAY_SHORT, weekday } from '../lib/dates';
import { openDay } from '../lib/nav';
import { useStore } from '../state/store';
import { ChartCard, columnPath, EmptyChart, Legend, useTooltip, useWidth } from './common';

const HEIGHT = 180;
const M = { top: 12, right: 8, bottom: 26, left: 36 };
const GAP = 2;

type Point = { day: string; health: number; work: number; bonus: number };
const SERIES = [
  { key: 'health', label: 'Health & body', color: 'var(--c-health)' },
  { key: 'work', label: 'Work & study', color: 'var(--c-work)' },
  { key: 'bonus', label: 'Bonuses and to-dos', color: 'var(--c-bonus)' },
] as const;

function niceMax(v: number) {
  const steps = [50, 100, 150, 200, 300, 400, 500, 750, 1000];
  return steps.find((s) => s >= v) ?? Math.ceil(v / 500) * 500;
}

export function XpChart({ points, monthly }: { points: Point[]; monthly: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { today } = useStore();
  const { wrapRef, show, hide, node } = useTooltip();
  const total = (p: Point) => p.health + p.work + p.bonus;
  const max = niceMax(Math.max(10, ...points.map(total)));

  const x = scaleBand<string>().domain(points.map((p) => p.day)).range([M.left, width - M.right]).paddingInner(monthly ? 0.25 : 0.4);
  const y = scaleLinear().domain([0, max]).range([HEIGHT - M.bottom, M.top]);
  const bw = Math.min(24, x.bandwidth());

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Day</th>
          {SERIES.map((s) => (
            <th scope="col" key={s.key}>
              {s.label}
            </th>
          ))}
          <th scope="col">Total</th>
        </tr>
      </thead>
      <tbody>
        {points.map((p) => (
          <tr key={p.day}>
            <th scope="row">{formatShort(p.day)}</th>
            <td>{p.health}</td>
            <td>{p.work}</td>
            <td>{p.bonus}</td>
            <td>{total(p)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="XP earned"
      description="Where each day's XP came from."
      legend={<Legend items={SERIES.map((s) => ({ label: s.label, color: s.color }))} />}
      table={table}
    >
      <div ref={ref} className="chart">
        {points.every((p) => total(p) === 0) ? (
          <EmptyChart>No XP earned in this period yet.</EmptyChart>
        ) : (
          <div ref={wrapRef} className="chart__wrap">
            <svg width={width} height={HEIGHT} role="img" aria-label="Stacked column chart of XP by area per day">
              {[0, max / 2, max].map((t) => (
                <g key={t}>
                  <line className="grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
                  <text className="axis" x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
                    {t}
                  </text>
                </g>
              ))}
              {points.map((p, i) => {
                const cx = (x(p.day) ?? 0) + x.bandwidth() / 2;
                let base = y(0);
                const visible = SERIES.filter((s) => p[s.key] > 0);
                const d = fromKey(p.day).getDate();
                const tip = (el: Element) =>
                  show(el, formatShort(p.day), [
                    { value: String(total(p)), label: 'XP total' },
                    ...SERIES.map((s) => ({ value: String(p[s.key]), label: s.label, key: s.color })),
                  ]);
                return (
                  <g key={p.day}>
                    {visible.map((s, j) => {
                      const h = y(0) - y(p[s.key]);
                      const top = base - h;
                      const isTop = j === visible.length - 1;
                      const segH = Math.max(0, h - (j > 0 ? GAP : 0));
                      const el = isTop ? (
                        <path key={s.key} d={columnPath(cx - bw / 2, top, bw, segH)} fill={s.color} />
                      ) : (
                        <rect key={s.key} x={cx - bw / 2} y={top} width={bw} height={segH} fill={s.color} />
                      );
                      base = top;
                      return el;
                    })}
                    <text className="axis" x={cx} y={HEIGHT - 8} textAnchor="middle">
                      {monthly ? (d === 1 || (i + 1) % (width < 480 ? 7 : 5) === 0 ? d : '') : WEEKDAY_SHORT[weekday(p.day)]}
                    </text>
                    <rect
                      className="hit is-clickable"
                      role="button"
                      aria-label={`Open ${formatShort(p.day)}`}
                      onClick={() => openDay(p.day, today)}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openDay(p.day, today))}
                      x={x(p.day)}
                      y={M.top}
                      width={x.step()}
                      height={y(0) - M.top}
                      tabIndex={total(p) > 0 ? 0 : -1}
                      onPointerEnter={(e) => tip(e.currentTarget)}
                      onFocus={(e) => tip(e.currentTarget)}
                      onPointerLeave={hide}
                      onBlur={hide}
                    />
                  </g>
                );
              })}
              <line className="baseline" x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} />
            </svg>
            {node}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
