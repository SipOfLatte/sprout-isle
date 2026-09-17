import { scaleLinear } from 'd3-scale';
import { formatShort } from '../lib/dates';
import { openDay } from '../lib/nav';
import { seedFrom } from '../lib/quests';
import type { LinearFit } from '../lib/stats';
import { LOOKBACK_DAYS, type Measure, type ScatterPoint } from '../lib/wellbeing';
import { useStore } from '../state/store';
import { ChartCard, EmptyChart, pct, useTooltip, useWidth } from './common';

const HEIGHT = 240;
const M = { top: 12, right: 14, bottom: 34, left: 30 };

/** Ratings are whole numbers, so dots get a small, stable vertical jitter to stay visible. */
const jitter = (day: string) => ((seedFrom(day) % 1000) / 1000 - 0.5) * 0.36;

export function CompletionScatter({ points, fit, measure }: { points: ScatterPoint[]; fit: LinearFit | null; measure: Measure }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { wrapRef, show, hide, node } = useTooltip();
  const { today } = useStore();
  const color = measure === 'mood' ? 'var(--c-mood)' : 'var(--c-energy)';

  const x = scaleLinear().domain([0, 1]).range([M.left + 6, width - M.right]);
  const y = scaleLinear().domain([0.6, 5.4]).range([HEIGHT - M.bottom, M.top]);

  const description = fit
    ? `Each dot is a day from the last ${LOOKBACK_DAYS}. Correlation r = ${fit.r.toFixed(2)} over ${fit.n} days: finishing a quarter more of your habits goes with ${fit.slope * 0.25 >= 0 ? '+' : '−'}${Math.abs(fit.slope * 0.25).toFixed(2)} ${measure}.`
    : `Each dot is a day from the last ${LOOKBACK_DAYS}. A trend line appears once there's enough variation.`;

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Habits completed</th>
          <th scope="col">{measure === 'mood' ? 'Mood' : 'Energy'}</th>
        </tr>
      </thead>
      <tbody>
        {points.map((p) => (
          <tr key={p.day}>
            <th scope="row">{formatShort(p.day)}</th>
            <td>{pct(p.score)}</td>
            <td>{p.rating}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard title={`Completion vs ${measure}`} description={description} table={table}>
      <div ref={ref} className="chart">
        {points.length < 3 ? (
          <EmptyChart>Needs a few days with both habits and a check-in.</EmptyChart>
        ) : (
          <div ref={wrapRef} className="chart__wrap">
            <svg width={width} height={HEIGHT} role="img" aria-label={`Scatter plot of daily habit completion against ${measure}`}>
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

              {points.map((p) => (
                <circle key={p.day} className="dot-ring" cx={x(p.score)} cy={y(p.rating + jitter(p.day))} r={4} fill={color} fillOpacity={0.7} />
              ))}
              {fit && <line className="fit-line" x1={x(0)} x2={x(1)} y1={y(fit.intercept)} y2={y(fit.intercept + fit.slope)} />}

              {points.map((p) => {
                const tip = (el: Element) =>
                  show(el, formatShort(p.day), [
                    { value: pct(p.score), label: 'of habits completed' },
                    { value: String(p.rating), label: measure, key: color },
                  ]);
                return (
                  <circle
                    key={`hit-${p.day}`}
                    className="hit is-clickable"
                    cx={x(p.score)}
                    cy={y(p.rating + jitter(p.day))}
                    r={10}
                    onPointerEnter={(e) => tip(e.currentTarget)}
                    onPointerLeave={hide}
                    onClick={() => openDay(p.day, today)}
                  />
                );
              })}
            </svg>
            {node}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
