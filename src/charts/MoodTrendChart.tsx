import { scaleLinear, scalePoint } from 'd3-scale';
import { line } from 'd3-shape';
import { formatShort, fromKey, WEEKDAY_SHORT, weekday } from '../lib/dates';
import { openDay } from '../lib/nav';
import { ENERGY_LABELS, MOOD_LABELS, type WellbeingPoint } from '../lib/wellbeing';
import { useStore } from '../state/store';
import { ChartCard, EmptyChart, Legend, useTooltip, useWidth } from './common';

const HEIGHT = 220;
const M = { top: 14, right: 12, bottom: 26, left: 30 };

const fmt = (v: number | null, labels: string[]) => (v === null ? 'n/a' : `${v} ${labels[v - 1].toLowerCase()}`);
const avg = (v: number | null) => (v === null ? 'n/a' : v.toFixed(1));

export function MoodTrendChart({ points, monthly }: { points: WellbeingPoint[]; monthly: boolean }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { wrapRef, show, hide, node } = useTooltip();
  const { today } = useStore();
  const hasData = points.some((p) => p.mood !== null || p.energy !== null);

  const x = scalePoint<string>().domain(points.map((p) => p.day)).range([M.left + 8, width - M.right - 8]);
  const y = scaleLinear().domain([1, 5]).range([HEIGHT - M.bottom, M.top]);
  const step = points.length > 1 ? x.step() : width;

  const path = (key: 'moodAvg' | 'energyAvg') =>
    line<WellbeingPoint>()
      .defined((p) => p[key] !== null)
      .x((p) => x(p.day) ?? 0)
      .y((p) => y(p[key] ?? 1))(points);

  const tickEvery = monthly ? (width < 480 ? 7 : 5) : 1;

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Day</th>
          <th scope="col">Mood</th>
          <th scope="col">Energy</th>
          <th scope="col">Mood, 7-day average</th>
          <th scope="col">Energy, 7-day average</th>
        </tr>
      </thead>
      <tbody>
        {points.map((p) => (
          <tr key={p.day}>
            <th scope="row">{formatShort(p.day)}</th>
            <td>{fmt(p.mood, MOOD_LABELS)}</td>
            <td>{fmt(p.energy, ENERGY_LABELS)}</td>
            <td>{avg(p.moodAvg)}</td>
            <td>{avg(p.energyAvg)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="Mood and energy"
      description="Dots are daily check-ins from 1 (low) to 5 (high). Lines are 7-day averages. Select a day to open it."
      legend={
        <Legend
          items={[
            { label: 'Mood', color: 'var(--c-mood)', shape: 'line' },
            { label: 'Energy', color: 'var(--c-energy)', shape: 'line' },
          ]}
        />
      }
      table={table}
      wide
    >
      <div ref={ref} className="chart">
        {!hasData ? (
          <EmptyChart>No check-ins in this period yet. Rate your mood and energy on the Today page.</EmptyChart>
        ) : (
          <div ref={wrapRef} className="chart__wrap">
            <svg width={width} height={HEIGHT} role="img" aria-label="Line chart of mood and energy ratings with 7-day averages">
              {[1, 2, 3, 4, 5].map((t) => (
                <g key={t}>
                  <line className="grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
                  <text className="axis" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">
                    {t}
                  </text>
                </g>
              ))}
              {points.map((p, i) => {
                const label = monthly ? (fromKey(p.day).getDate() === 1 || (i + 1) % tickEvery === 0 ? String(fromKey(p.day).getDate()) : '') : WEEKDAY_SHORT[weekday(p.day)];
                return (
                  <text key={p.day} className="axis" x={x(p.day)} y={HEIGHT - 8} textAnchor="middle">
                    {label}
                  </text>
                );
              })}

              <path d={path('moodAvg') ?? ''} fill="none" stroke="var(--c-mood)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
              <path d={path('energyAvg') ?? ''} fill="none" stroke="var(--c-energy)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

              {points.map((p) => (
                <g key={p.day}>
                  {p.energy !== null && <circle className="dot-ring" cx={(x(p.day) ?? 0) + 3} cy={y(p.energy)} r={4} fill="var(--c-energy)" />}
                  {p.mood !== null && <circle className="dot-ring" cx={(x(p.day) ?? 0) - 3} cy={y(p.mood)} r={4} fill="var(--c-mood)" />}
                </g>
              ))}

              {points.map((p) => {
                const tip = (el: Element) =>
                  show(el, formatShort(p.day), [
                    { value: fmt(p.mood, MOOD_LABELS), label: `mood, 7-day average ${avg(p.moodAvg)}`, key: 'var(--c-mood)' },
                    { value: fmt(p.energy, ENERGY_LABELS), label: `energy, 7-day average ${avg(p.energyAvg)}`, key: 'var(--c-energy)' },
                  ]);
                const future = p.day > today;
                return (
                  <rect
                    key={p.day}
                    className={`hit${future ? '' : ' is-clickable'}`}
                    x={(x(p.day) ?? 0) - step / 2}
                    y={M.top}
                    width={step}
                    height={HEIGHT - M.bottom - M.top}
                    tabIndex={future ? -1 : 0}
                    role={future ? undefined : 'button'}
                    aria-label={future ? undefined : `Open ${formatShort(p.day)}`}
                    onClick={() => !future && openDay(p.day, today)}
                    onKeyDown={(e) => !future && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openDay(p.day, today))}
                    onPointerEnter={(e) => !future && tip(e.currentTarget)}
                    onFocus={(e) => !future && tip(e.currentTarget)}
                    onPointerLeave={hide}
                    onBlur={hide}
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
