import { scaleBand, scaleLinear } from 'd3-scale';
import type { WeekdayPoint } from '../lib/analytics';
import { WEEKDAY_SHORT } from '../lib/dates';
import { ChartCard, columnPath, EmptyChart, pct, useTooltip, useWidth } from './common';

const HEIGHT = 180;
const M = { top: 22, right: 8, bottom: 26, left: 8 };

export function WeekdayChart({ points, weeks }: { points: WeekdayPoint[]; weeks: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { wrapRef, show, hide, node } = useTooltip();
  const scored = points.filter((p) => p.score !== null);
  const best = scored.length ? scored.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a)) : null;
  const worst = scored.length ? scored.reduce((a, b) => ((b.score ?? 1) < (a.score ?? 1) ? b : a)) : null;

  const x = scaleBand<number>().domain(points.map((p) => p.weekday)).range([M.left, width - M.right]).paddingInner(0.35);
  const y = scaleLinear().domain([0, 1]).range([HEIGHT - M.bottom, M.top]);
  const bw = Math.min(24, x.bandwidth());

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Weekday</th>
          <th scope="col">Average score</th>
          <th scope="col">Habit-days</th>
        </tr>
      </thead>
      <tbody>
        {points.map((p) => (
          <tr key={p.weekday}>
            <th scope="row">{WEEKDAY_SHORT[p.weekday]}</th>
            <td>{pct(p.score)}</td>
            <td>{p.samples}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="Weekly rhythm"
      description={
        best && worst && best !== worst ? (
          <>
            Last {weeks} weeks. You're strongest on {WEEKDAY_SHORT[best.weekday]} and find {WEEKDAY_SHORT[worst.weekday]} hardest.
          </>
        ) : (
          `Average score by weekday over the last ${weeks} weeks.`
        )
      }
      table={table}
    >
      <div ref={ref} className="chart">
        {!scored.length ? (
          <EmptyChart>Needs a few days of history.</EmptyChart>
        ) : (
          <div ref={wrapRef} className="chart__wrap">
            <svg width={width} height={HEIGHT} role="img" aria-label="Column chart of average score by weekday">
              {points.map((p) => {
                const cx = (x(p.weekday) ?? 0) + x.bandwidth() / 2;
                const v = p.score ?? 0;
                const isBest = best?.weekday === p.weekday;
                const tip = (el: Element) =>
                  show(el, WEEKDAY_SHORT[p.weekday], [{ value: pct(p.score), label: `average across ${p.samples} habit-days` }]);
                return (
                  <g key={p.weekday}>
                    <path d={columnPath(cx - bw / 2, y(v), bw, y(0) - y(v))} fill={isBest ? 'var(--c-primary)' : 'var(--c-muted-mark)'} />
                    <text className="value" x={cx} y={y(v) - 6} textAnchor="middle">
                      {pct(p.score)}
                    </text>
                    <text className="axis" x={cx} y={HEIGHT - 8} textAnchor="middle">
                      {WEEKDAY_SHORT[p.weekday]}
                    </text>
                    <rect
                      className="hit"
                      x={x(p.weekday)}
                      y={M.top}
                      width={x.step()}
                      height={y(0) - M.top}
                      tabIndex={0}
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
