// One dot per day: share of habits completed against that day's mood or energy, with a least-squares
// line. With both measures selected, each gets its own colour and line on the same axes.

import { scaleLinear } from 'd3-scale';
import { formatShort } from '../lib/dates';
import { openDay } from '../lib/nav';
import { seedFrom } from '../lib/quests';
import type { LinearFit } from '../lib/stats';
import { LOOKBACK_DAYS, MEASURE_COLOR, MEASURE_NAME, type Measure, type ScatterPoint } from '../lib/wellbeing';
import { useStore } from '../state/store';
import { ChartCard, EmptyChart, Legend, pct, useTooltip, useWidth } from './common';

const HEIGHT = 240;
const M = { top: 12, right: 14, bottom: 34, left: 30 };

export interface ScatterSeries {
  measure: Measure;
  points: ScatterPoint[];
  fit: LinearFit | null;
}

/** Ratings are whole numbers, so dots get a small, stable vertical jitter to stay visible.
 *  Energy uses a different seed so its dots don't sit exactly on top of mood's. */
const jitter = (day: string, measure: Measure) => ((seedFrom(day + measure) % 1000) / 1000 - 0.5) * 0.36;

function describeFit(s: ScatterSeries): string {
  if (!s.fit) return `${MEASURE_NAME[s.measure]} needs more variation for a trend line.`;
  const perQuarter = s.fit.slope * 0.25;
  return `${MEASURE_NAME[s.measure]}: r = ${s.fit.r.toFixed(2)} over ${s.fit.n} days, and finishing a quarter more of your habits goes with ${perQuarter >= 0 ? '+' : '−'}${Math.abs(perQuarter).toFixed(2)}.`;
}

export function CompletionScatter({ series }: { series: ScatterSeries[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { wrapRef, show, hide, node } = useTooltip();
  const { today } = useStore();
  const paired = series.length > 1;
  const names = series.map((s) => s.measure).join(' and ');

  const x = scaleLinear().domain([0, 1]).range([M.left + 6, width - M.right]);
  const y = scaleLinear().domain([0.6, 5.4]).range([HEIGHT - M.bottom, M.top]);
  const enough = series.some((s) => s.points.length >= 3);

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Habits completed</th>
          {series.map((s) => (
            <th scope="col" key={s.measure}>
              {MEASURE_NAME[s.measure]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[...new Set(series.flatMap((s) => s.points.map((p) => p.day)))].sort().map((day) => {
          const score = series.flatMap((s) => s.points).find((p) => p.day === day)!.score;
          return (
            <tr key={day}>
              <th scope="row">{formatShort(day)}</th>
              <td>{pct(score)}</td>
              {series.map((s) => (
                <td key={s.measure}>{s.points.find((p) => p.day === day)?.rating ?? 'n/a'}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title={`Completion vs ${names}`}
      description={`Each dot is a day from the last ${LOOKBACK_DAYS}. ${series.map(describeFit).join(' ')}`}
      legend={paired && <Legend items={series.map((s) => ({ label: MEASURE_NAME[s.measure], color: MEASURE_COLOR[s.measure] }))} />}
      table={table}
    >
      <div ref={ref} className="chart">
        {!enough ? (
          <EmptyChart>Needs a few days with both habits and a check-in.</EmptyChart>
        ) : (
          <div ref={wrapRef} className="chart__wrap">
            <svg width={width} height={HEIGHT} role="img" aria-label={`Scatter plot of daily habit completion against ${names}`}>
              {[1, 2, 3, 4, 5].map((t) => (
                <g key={t}>
                  <line className="grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
                  <text className="axis" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                    {t}
                  </text>
                </g>
              ))}
              {[0, 0.5, 1].map((t) => (
                <text key={t} className="axis" x={x(t)} y={HEIGHT - 16} textAnchor={t === 0 ? 'start' : t === 1 ? 'end' : 'middle'}>
                  {pct(t)}
                </text>
              ))}
              <text className="axis" x={(M.left + width - M.right) / 2} y={HEIGHT - 2} textAnchor="middle">
                habits completed that day
              </text>

              {series.map((s) =>
                s.points.map((p) => (
                  <circle
                    key={`${s.measure}-${p.day}`}
                    className="dot-ring"
                    cx={x(p.score)}
                    cy={y(p.rating + jitter(p.day, s.measure))}
                    r={4}
                    fill={MEASURE_COLOR[s.measure]}
                    fillOpacity={0.7}
                  />
                )),
              )}
              {series.map(
                (s) =>
                  s.fit && (
                    <line
                      key={`fit-${s.measure}`}
                      className="fit-line"
                      style={paired ? { stroke: MEASURE_COLOR[s.measure] } : undefined}
                      x1={x(0)}
                      x2={x(1)}
                      y1={y(s.fit.intercept)}
                      y2={y(s.fit.intercept + s.fit.slope)}
                    />
                  ),
              )}

              {series.map((s) =>
                s.points.map((p) => {
                  const tip = (el: Element) =>
                    show(el, formatShort(p.day), [
                      { value: pct(p.score), label: 'of habits completed' },
                      { value: String(p.rating), label: s.measure, key: MEASURE_COLOR[s.measure] },
                    ]);
                  return (
                    <circle
                      key={`hit-${s.measure}-${p.day}`}
                      className="hit is-clickable"
                      cx={x(p.score)}
                      cy={y(p.rating + jitter(p.day, s.measure))}
                      r={10}
                      onPointerEnter={(e) => tip(e.currentTarget)}
                      onPointerLeave={hide}
                      onClick={() => openDay(p.day, today)}
                    />
                  );
                }),
              )}
            </svg>
            {node}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
