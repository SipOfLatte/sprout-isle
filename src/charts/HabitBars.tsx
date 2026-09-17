// Horizontal bars of completion rate per habit, coloured by area.

import { scaleLinear } from 'd3-scale';
import type { HabitRate } from '../lib/analytics';
import { AREA_LABEL } from '../lib/types';
import { barPath, ChartCard, EmptyChart, Legend, pct, truncate, useTooltip, useWidth } from './common';

const ROW = 30;

export function HabitBars({ rates }: { rates: HabitRate[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { wrapRef, show, hide, node } = useTooltip();
  const labelW = width < 420 ? 104 : 140;
  const x = scaleLinear().domain([0, 1]).range([labelW, width - 44]);
  const height = rates.length * ROW + 4;
  const areas = [...new Set(rates.map((r) => r.habit.area))];

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Habit</th>
          <th scope="col">Area</th>
          <th scope="col">Rate</th>
          <th scope="col">Completions</th>
          <th scope="col">Expected</th>
        </tr>
      </thead>
      <tbody>
        {rates.map((r) => (
          <tr key={r.habit.id}>
            <th scope="row">{r.habit.name}</th>
            <td>{AREA_LABEL[r.habit.area]}</td>
            <td>{pct(r.rate)}</td>
            <td>{r.done}</td>
            <td>{r.expected}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="By habit"
      description="Completion rate in this period, best first."
      legend={
        areas.length > 1 && (
          <Legend items={areas.map((a) => ({ label: AREA_LABEL[a], color: `var(--c-${a})` }))} />
        )
      }
      table={table}
    >
      <div ref={ref} className="chart">
        {rates.length === 0 ? (
          <EmptyChart>Nothing was due in this period.</EmptyChart>
        ) : (
          <div ref={wrapRef} className="chart__wrap">
            <svg width={width} height={height} role="img" aria-label="Bar chart of completion rate by habit">
              {rates.map((r, i) => {
                const y = i * ROW + 3;
                const barH = Math.min(18, ROW - 8);
                return (
                  <g
                    key={r.habit.id}
                    className="bar-row"
                    tabIndex={0}
                    onPointerEnter={(e) => show(e.currentTarget, r.habit.name, [{ value: pct(r.rate), label: `${r.done} done, ${r.expected} expected`, key: `var(--c-${r.habit.area})` }])}
                    onFocus={(e) => show(e.currentTarget, r.habit.name, [{ value: pct(r.rate), label: `${r.done} done, ${r.expected} expected`, key: `var(--c-${r.habit.area})` }])}
                    onPointerLeave={hide}
                    onBlur={hide}
                  >
                    <rect className="hit" x={0} y={y - 3} width={width} height={ROW} />
                    <text className="row-label" x={0} y={y + barH / 2} dy="0.32em">
                      {truncate(r.habit.name, width < 420 ? 13 : 18)}
                    </text>
                    <rect className="track" x={labelW} y={y} width={x(1) - labelW} height={barH} rx={4} />
                    <path d={barPath(labelW, y, x(r.rate) - labelW, barH)} fill={`var(--c-${r.habit.area})`} />
                    <text className="value" x={x(r.rate) + 6} y={y + barH / 2} dy="0.32em">
                      {pct(r.rate)}
                    </text>
                  </g>
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
