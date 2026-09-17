// Daily completion columns with a 7-day rolling average line. Selecting a column opens that day.

import { scaleBand, scaleLinear } from 'd3-scale';
import { line } from 'd3-shape';
import type { DailyPoint } from '../lib/analytics';
import { formatShort, fromKey, WEEKDAY_SHORT, weekday } from '../lib/dates';
import { openDay } from '../lib/nav';
import { useStore } from '../state/store';
import { ChartCard, columnPath, EmptyChart, Legend, pct, useTooltip, useWidth } from './common';

const HEIGHT = 200;
const M = { top: 12, right: 8, bottom: 26, left: 36 };

export function CompletionChart({ points, avg, monthly }: { points: DailyPoint[]; avg: (number | null)[]; monthly: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { today } = useStore();
  const { wrapRef, show, hide, node } = useTooltip();
  const hasData = points.some((p) => p.score !== null);

  const x = scaleBand<string>()
    .domain(points.map((p) => p.day))
    .range([M.left, width - M.right])
    .paddingInner(monthly ? 0.25 : 0.4);
  const y = scaleLinear().domain([0, 1]).range([HEIGHT - M.bottom, M.top]);
  const bw = Math.min(24, x.bandwidth());
  const cx = (day: string) => (x(day) ?? 0) + x.bandwidth() / 2;

  const avgLine = line<number | null>()
    .defined((v) => v !== null)
    .x((_, i) => cx(points[i].day))
    .y((v) => y(v ?? 0))(avg);

  const tickEvery = monthly ? (width < 480 ? 7 : 5) : 1;
  const label = (day: string, i: number) => {
    if (!monthly) return WEEKDAY_SHORT[weekday(day)];
    const d = fromKey(day).getDate();
    return d === 1 || (i + 1) % tickEvery === 0 ? String(d) : '';
  };

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Score</th>
          <th scope="col">Done</th>
          <th scope="col">7-day average</th>
        </tr>
      </thead>
      <tbody>
        {points.map((p, i) => (
          <tr key={p.day}>
            <th scope="row">{formatShort(p.day)}</th>
            <td>{pct(p.score)}</td>
            <td>{p.due ? `${p.done} of ${p.due}` : 'n/a'}</td>
            <td>{pct(avg[i])}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="Daily completion"
      description="Share of each day's scheduled habits finished, with partial credit for amounts. Select a day to open it."
      legend={
        <Legend
          items={[
            { label: 'Daily score', color: 'var(--c-primary)' },
            { label: '7-day average', color: 'var(--c-trend)', shape: 'line' },
          ]}
        />
      }
      table={table}
      wide
    >
      <div ref={ref} className="chart">
        {!hasData ? (
          <EmptyChart>No scheduled habits in this period yet.</EmptyChart>
        ) : (
          <div ref={wrapRef} className="chart__wrap">
            <svg width={width} height={HEIGHT} role="img" aria-label="Column chart of daily completion score with a 7-day average line">
              {[0, 0.5, 1].map((t) => (
                <g key={t}>
                  <line className="grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
                  <text className="axis" x={M.left - 6} y={y(t)} dy="0.32em" textAnchor="end">
                    {t * 100}%
                  </text>
                </g>
              ))}
              {points.map((p, i) => (
                <g key={p.day}>
                  {p.score !== null && p.score > 0 && (
                    <path d={columnPath(cx(p.day) - bw / 2, y(p.score), bw, y(0) - y(p.score))} fill="var(--c-primary)" />
                  )}
                  <text className="axis" x={cx(p.day)} y={HEIGHT - 8} textAnchor="middle">
                    {label(p.day, i)}
                  </text>
                  <rect
                    className={`hit${p.score !== null ? ' is-clickable' : ''}`}
                    role={p.score !== null ? 'button' : undefined}
                    aria-label={p.score !== null ? `Open ${formatShort(p.day)}` : undefined}
                    onClick={() => p.score !== null && openDay(p.day, today)}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openDay(p.day, today))}
                    x={x(p.day)}
                    y={M.top}
                    width={x.step()}
                    height={y(0) - M.top}
                    tabIndex={p.score === null ? -1 : 0}
                    onPointerEnter={(e) =>
                      p.score !== null &&
                      show(e.currentTarget, formatShort(p.day), [
                        { value: pct(p.score), label: `score, ${p.done} of ${p.due} done`, key: 'var(--c-primary)' },
                        { value: pct(avg[i]), label: '7-day average', key: 'var(--c-trend)' },
                        { value: 'Click', label: 'to open this day' },
                      ])
                    }
                    onFocus={(e) =>
                      p.score !== null &&
                      show(e.currentTarget, formatShort(p.day), [
                        { value: pct(p.score), label: `score, ${p.done} of ${p.due} done`, key: 'var(--c-primary)' },
                        { value: pct(avg[i]), label: '7-day average', key: 'var(--c-trend)' },
                      ])
                    }
                    onPointerLeave={hide}
                    onBlur={hide}
                  />
                </g>
              ))}
              <line className="baseline" x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} />
              {avgLine && <path d={avgLine} className="trend-line" />}
            </svg>
            {node}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
