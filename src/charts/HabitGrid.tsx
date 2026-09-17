// Habit by day heatmap. Partial amounts get lighter steps of the same colour as full completions.

import type { CellState, GridCell } from '../lib/analytics';
import { formatShort, fromKey, WEEKDAY_LETTER, weekday } from '../lib/dates';
import { AREA_LABEL, type Habit } from '../lib/types';
import { openDay } from '../lib/nav';
import { useStore } from '../state/store';
import { ChartCard, EmptyChart, Legend, pct, truncate, useTooltip, useWidth } from './common';

const STATE_LABEL: Record<CellState, string> = {
  done: 'Done',
  partial: 'Partly done',
  missed: 'Missed',
  rest: 'Not scheduled',
  future: 'Upcoming',
  inactive: 'Not tracked yet',
};

/** Sequential amber ramp: partial credit steps toward the full "done" colour. */
function fill(cell: GridCell): string | null {
  switch (cell.state) {
    case 'done':
      return 'var(--c-seq-4)';
    case 'partial':
      return cell.value >= 0.66 ? 'var(--c-seq-3)' : cell.value >= 0.33 ? 'var(--c-seq-2)' : 'var(--c-seq-1)';
    case 'missed':
      return 'var(--c-track)';
    default:
      return null;
  }
}

export function HabitGrid({ rows }: { rows: { habit: Habit; cells: GridCell[] }[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { today } = useStore();
  const { wrapRef, show, hide, node } = useTooltip();

  const cols = rows[0]?.cells.length ?? 0;
  const labelW = width < 480 ? 96 : 150;
  const gap = 2;
  // Cells shrink to fit a month on narrow screens, down to 6px.
  const cell = Math.max(6, Math.min(26, Math.floor((width - labelW) / Math.max(cols, 1)) - gap));
  const top = 18;
  const height = top + rows.length * (cell + gap);
  const chartW = labelW + cols * (cell + gap);

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Habit</th>
          {rows[0]?.cells.map((c) => (
            <th scope="col" key={c.day}>
              {formatShort(c.day)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(({ habit, cells }) => (
          <tr key={habit.id}>
            <th scope="row">{habit.name}</th>
            {cells.map((c) => (
              <td key={c.day}>{c.state === 'partial' ? pct(c.value) : c.state === 'done' ? 'Done' : c.state === 'missed' ? 'Missed' : '–'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const tip = (el: Element, habit: Habit, c: GridCell) =>
    show(el, `${habit.name}, ${formatShort(c.day)}`, [
      {
        value: habit.target > 1 ? `${c.amount} / ${habit.target}` : STATE_LABEL[c.state],
        label: habit.target > 1 ? `${habit.unit || 'logged'}, ${STATE_LABEL[c.state].toLowerCase()}` : AREA_LABEL[habit.area],
      },
    ]);

  return (
    <ChartCard
      title="Habit grid"
      description="Every habit, every day. Darker means closer to the goal. Select a square to open that day."
      legend={
        <Legend
          items={[
            { label: 'Missed', color: 'var(--c-track)' },
            { label: 'Partly done', color: 'var(--c-seq-2)' },
            { label: 'Done', color: 'var(--c-seq-4)' },
          ]}
        />
      }
      table={table}
      wide
    >
      <div ref={ref} className="chart">
        {rows.length === 0 ? (
          <EmptyChart>Add a habit to see the grid.</EmptyChart>
        ) : (
          <div ref={wrapRef} className="chart__wrap">
            <svg width={chartW} height={height} role="img" aria-label="Heatmap of habits by day">
              {rows[0].cells.map((c, i) => {
                const d = fromKey(c.day).getDate();
                const show = cols <= 7 || d === 1 || d % 7 === 0;
                return (
                  show && (
                    <text key={c.day} className="axis" x={labelW + i * (cell + gap) + cell / 2} y={11} textAnchor="middle">
                      {cols <= 7 ? WEEKDAY_LETTER[weekday(c.day)] : d}
                    </text>
                  )
                );
              })}
              {rows.map(({ habit, cells }, r) => {
                const y = top + r * (cell + gap);
                return (
                  <g key={habit.id}>
                    <rect x={0} y={y + cell / 2 - 4} width={3} height={8} fill={`var(--c-${habit.area})`} />
                    <text className="row-label" x={8} y={y + cell / 2} dy="0.32em">
                      {truncate(habit.name, width < 480 ? 11 : 18)}
                    </text>
                    {cells.map((c, i) => {
                      const x = labelW + i * (cell + gap);
                      const f = fill(c);
                      if (c.state === 'future' || c.state === 'inactive') return null;
                      return f ? (
                        <rect
                          key={c.day}
                          className="cell is-clickable"
                          onClick={() => openDay(c.day, today)}
                          x={x}
                          y={y}
                          width={cell}
                          height={cell}
                          rx={Math.min(3, cell / 4)}
                          fill={f}
                          onPointerEnter={(e) => tip(e.currentTarget, habit, c)}
                          onPointerLeave={hide}
                        />
                      ) : (
                        <circle
                          key={c.day}
                          className="cell cell--rest is-clickable"
                          onClick={() => openDay(c.day, today)}
                          cx={x + cell / 2}
                          cy={y + cell / 2}
                          r={Math.max(1, cell / 10)}
                          onPointerEnter={(e) => tip(e.currentTarget, habit, c)}
                          onPointerLeave={hide}
                        />
                      );
                    })}
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
