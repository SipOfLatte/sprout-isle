// Average mood or energy for each weekday over the last 12 weeks.

import { scaleBand, scaleLinear } from 'd3-scale';
import { WEEKDAY_SHORT } from '../lib/dates';
import type { Measure } from '../lib/wellbeing';
import { ChartCard, columnPath, EmptyChart, useTooltip, useWidth } from './common';

const HEIGHT = 240;
const M = { top: 22, right: 8, bottom: 26, left: 8 };

interface Point {
  weekday: number;
  mean: number | null;
  n: number;
}

export function WeekdayRatingChart({ points, measure }: { points: Point[]; measure: Measure }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { wrapRef, show, hide, node } = useTooltip();
  const color = measure === 'mood' ? 'var(--c-mood)' : 'var(--c-energy)';
  const valid = points.filter((p) => p.mean !== null && p.n >= 3);
  const best = valid.length ? valid.reduce((a, b) => (b.mean! > a.mean! ? b : a)) : null;
  const worst = valid.length ? valid.reduce((a, b) => (b.mean! < a.mean! ? b : a)) : null;

  const x = scaleBand<number>().domain(points.map((p) => p.weekday)).range([M.left, width - M.right]).paddingInner(0.35);
  // Ratings start at 1, so columns grow from 1 rather than 0.
  const y = scaleLinear().domain([1, 5]).range([HEIGHT - M.bottom, M.top]);
  const bw = Math.min(24, x.bandwidth());

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Weekday</th>
          <th scope="col">Average {measure}</th>
          <th scope="col">Check-ins</th>
        </tr>
      </thead>
      <tbody>
        {points.map((p) => (
          <tr key={p.weekday}>
            <th scope="row">{WEEKDAY_SHORT[p.weekday]}</th>
            <td>{p.mean === null ? 'n/a' : p.mean.toFixed(2)}</td>
            <td>{p.n}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title={`${measure === 'mood' ? 'Mood' : 'Energy'} by weekday`}
      description={
        best && worst && best !== worst
          ? `Last 12 weeks. Highest on ${WEEKDAY_SHORT[best.weekday]}, lowest on ${WEEKDAY_SHORT[worst.weekday]}. Scale starts at 1.`
          : `Average ${measure} per weekday over the last 12 weeks. Scale starts at 1.`
      }
      table={table}
    >
      <div ref={ref} className="chart">
        {valid.length === 0 ? (
          <EmptyChart>Needs a few weeks of check-ins.</EmptyChart>
        ) : (
          <div ref={wrapRef} className="chart__wrap">
            <svg width={width} height={HEIGHT} role="img" aria-label={`Column chart of average ${measure} by weekday`}>
              {points.map((p) => {
                const cx = (x(p.weekday) ?? 0) + x.bandwidth() / 2;
                const enough = p.mean !== null && p.n >= 3;
                const v = enough ? p.mean! : 1;
                const tip = (el: Element) =>
                  show(el, WEEKDAY_SHORT[p.weekday], [
                    { value: enough ? p.mean!.toFixed(2) : 'n/a', label: `average ${measure} over ${p.n} check-ins`, key: color },
                  ]);
                return (
                  <g key={p.weekday}>
                    {enough && (
                      <>
                        <path d={columnPath(cx - bw / 2, y(v), bw, y(1) - y(v))} fill={best?.weekday === p.weekday ? color : 'var(--c-muted-mark)'} />
                        <text className="value" x={cx} y={y(v) - 6} textAnchor="middle">
                          {v.toFixed(1)}
                        </text>
                      </>
                    )}
                    <text className="axis" x={cx} y={HEIGHT - 8} textAnchor="middle">
                      {WEEKDAY_SHORT[p.weekday]}
                    </text>
                    <rect
                      className="hit"
                      x={x(p.weekday)}
                      y={M.top}
                      width={x.step()}
                      height={y(1) - M.top}
                      tabIndex={0}
                      onPointerEnter={(e) => tip(e.currentTarget)}
                      onFocus={(e) => tip(e.currentTarget)}
                      onPointerLeave={hide}
                      onBlur={hide}
                    />
                  </g>
                );
              })}
              <line className="baseline" x1={M.left} x2={width - M.right} y1={y(1)} y2={y(1)} />
            </svg>
            {node}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
