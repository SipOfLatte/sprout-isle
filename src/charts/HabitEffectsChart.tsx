// For each habit, the difference in mood or energy between days it was done and skipped,
// with 95% confidence intervals. Two panels: same day and next day.

import { scaleLinear } from 'd3-scale';
import type { MeanDifference } from '../lib/stats';
import { LOOKBACK_DAYS, MIN_GROUP, type HabitEffect, type Measure } from '../lib/wellbeing';
import { ChartCard, EmptyChart, truncate, useTooltip, useWidth } from './common';

const ROW = 30;
const TOP = 26;

const signed = (v: number) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(1)}`;
const isClear = (d: MeanDifference) => d.lo > 0 || d.hi < 0;

/** Plain-English takeaway for the clearest same-day and next-day effects. */
function takeaway(effects: HabitEffect[], measure: Measure): string | null {
  const best = (key: 'sameDay' | 'nextDay') =>
    effects
      .filter((e) => e[key] && isClear(e[key]!) && e[key]!.diff > 0)
      .sort((a, b) => b[key]!.diff - a[key]!.diff)[0];
  const same = best('sameDay');
  const next = best('nextDay');
  const parts: string[] = [];
  if (same) parts.push(`your ${measure} averages ${signed(same.sameDay!.diff)} points higher on days you do ${same.habit.name.toLowerCase()}`);
  if (next && next.habit.id !== same?.habit.id)
    parts.push(`${signed(next.nextDay!.diff)} the day after ${next.habit.name.toLowerCase()}`);
  if (!parts.length) return null;
  const text = parts.join(', and ');
  return text[0].toUpperCase() + text.slice(1) + '.';
}

export function HabitEffectsChart({ effects, measure }: { effects: HabitEffect[]; measure: Measure }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { wrapRef, show, hide, node } = useTooltip();
  const color = measure === 'mood' ? 'var(--c-mood)' : 'var(--c-energy)';
  const hasAny = effects.some((e) => e.sameDay || e.nextDay);

  const labelW = width < 480 ? 92 : 150;
  const gap = 18;
  const facetW = Math.max(80, (width - labelW - gap) / 2);
  const extent = Math.max(
    1,
    ...effects.flatMap((e) => [e.sameDay, e.nextDay].filter(Boolean).flatMap((d) => [Math.abs(d!.lo), Math.abs(d!.hi)])),
  );
  const bound = Math.ceil(extent * 2) / 2;
  const facets = [
    { key: 'sameDay' as const, title: 'Same day', x0: labelW },
    { key: 'nextDay' as const, title: 'Next day', x0: labelW + facetW + gap },
  ];
  const height = TOP + effects.length * ROW + 22;
  const summary = takeaway(effects, measure);

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Habit</th>
          <th scope="col">Same day: difference (95% CI)</th>
          <th scope="col">Days done / not done</th>
          <th scope="col">Next day: difference (95% CI)</th>
          <th scope="col">Days done / not done</th>
        </tr>
      </thead>
      <tbody>
        {effects.map((e) => (
          <tr key={e.habit.id}>
            <th scope="row">{e.habit.name}</th>
            {[e.sameDay, e.nextDay].map((d, i) => (
              <FragmentCells key={i} d={d} />
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title={`What lines up with better ${measure}`}
      description={
        <>
          Average {measure} on days you did each habit minus days it was due but skipped, over the last {LOOKBACK_DAYS} days. Lines are 95% confidence intervals.
          {summary && <> {summary}</>}
        </>
      }
      legend={
        <ul className="legend">
          <li>
            <svg width={14} height={14} aria-hidden="true">
              <circle cx={7} cy={7} r={5} fill={color} />
            </svg>
            Clear difference
          </li>
          <li>
            <svg width={14} height={14} aria-hidden="true">
              <circle cx={7} cy={7} r={4.5} fill="var(--surface)" stroke={color} strokeWidth={2} />
            </svg>
            Could be chance (interval crosses 0)
          </li>
        </ul>
      }
      table={table}
      wide
    >
      <div ref={ref} className="chart">
        {!hasAny ? (
          <EmptyChart>
            Needs at least {MIN_GROUP} check-in days when each habit was done and {MIN_GROUP} when it was skipped. Keep checking in and this fills in.
          </EmptyChart>
        ) : (
          <div ref={wrapRef} className="chart__wrap">
            <svg width={width} height={height} role="img" aria-label={`Confidence intervals for the difference in ${measure} on days each habit was done`}>
              {facets.map((f) => {
                const x = scaleLinear().domain([-bound, bound]).range([f.x0 + 8, f.x0 + facetW - 8]);
                return (
                  <g key={f.key}>
                    <text className="facet-title" x={f.x0 + facetW / 2} y={12} textAnchor="middle">
                      {f.title}
                    </text>
                    <line className="zero-line" x1={x(0)} x2={x(0)} y1={TOP - 4} y2={height - 20} />
                    {[-bound, bound].map((t) => (
                      <text key={t} className="axis" x={x(t)} y={height - 6} textAnchor={t < 0 ? 'start' : 'end'}>
                        {signed(t)}
                      </text>
                    ))}
                    <text className="axis" x={x(0)} y={height - 6} textAnchor="middle">
                      0
                    </text>
                    {effects.map((e, row) => {
                      const d = e[f.key];
                      const cy = TOP + row * ROW + ROW / 2;
                      if (!d) {
                        return (
                          <text key={e.habit.id} className="axis" x={x(0) + 6} y={cy} dy="0.32em">
                            not enough data
                          </text>
                        );
                      }
                      const clear = isClear(d);
                      const tip = (el: Element) =>
                        show(el, `${e.habit.name}, ${f.title.toLowerCase()}`, [
                          { value: `${signed(d.diff)} ${measure}`, label: `95% CI ${signed(d.lo)} to ${signed(d.hi)}`, key: color },
                          { value: d.meanA.toFixed(2), label: `average over ${d.nA} days done` },
                          { value: d.meanB.toFixed(2), label: `average over ${d.nB} days skipped` },
                        ]);
                      return (
                        <g
                          key={e.habit.id}
                          className="bar-row"
                          tabIndex={0}
                          onPointerEnter={(ev) => tip(ev.currentTarget)}
                          onFocus={(ev) => tip(ev.currentTarget)}
                          onPointerLeave={hide}
                          onBlur={hide}
                        >
                          <rect className="hit" x={f.x0} y={cy - ROW / 2} width={facetW} height={ROW} />
                          <line className="ci" x1={x(Math.max(-bound, d.lo))} x2={x(Math.min(bound, d.hi))} y1={cy} y2={cy} stroke={color} opacity={clear ? 1 : 0.55} />
                          <circle cx={x(d.diff)} cy={cy} r={5} fill={clear ? color : 'var(--surface)'} stroke={color} strokeWidth={2} />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
              {effects.map((e, row) => (
                <text key={e.habit.id} className="row-label" x={0} y={TOP + row * ROW + ROW / 2} dy="0.32em">
                  {truncate(e.habit.name, width < 480 ? 12 : 20)}
                </text>
              ))}
            </svg>
            {node}
            <p className="effect-note">
              This shows what tends to happen together, not what causes what. A busy week can lower both your habits and your mood at the same time.
            </p>
          </div>
        )}
      </div>
    </ChartCard>
  );
}

function FragmentCells({ d }: { d: MeanDifference | null }) {
  if (!d)
    return (
      <>
        <td>not enough data</td>
        <td>–</td>
      </>
    );
  return (
    <>
      <td>
        {signed(d.diff)} ({signed(d.lo)} to {signed(d.hi)})
      </td>
      <td>
        {d.nA} / {d.nB}
      </td>
    </>
  );
}
