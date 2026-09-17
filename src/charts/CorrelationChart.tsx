// Lower-triangle matrix of phi correlations between habits, on a diverging colour scale.

import { MIN_CORRELATION_SAMPLES, type CorrelationResult } from '../lib/analytics';
import { ChartCard, EmptyChart, truncate, useTooltip, useWidth } from './common';

/** Diverging scale: amber (moves apart) ← neutral grey → violet (moves together). */
function color(r: number): string {
  const a = Math.min(1, Math.abs(r));
  const step = a < 0.1 ? 0 : a < 0.3 ? 1 : a < 0.5 ? 2 : 3;
  if (step === 0) return 'var(--c-div-mid)';
  return r > 0 ? `var(--c-div-pos-${step})` : `var(--c-div-neg-${step})`;
}

/** One decimal, without a misleading "-0.0". */
const fmt1 = (v: number) => (Math.abs(v) < 0.05 ? '0.0' : v.toFixed(1));

/** Rough verbal label for a correlation, used in tooltips. */
function strength(r: number) {
  const a = Math.abs(r);
  if (a < 0.1) return 'no real link';
  const word = a < 0.3 ? 'weak' : a < 0.5 ? 'moderate' : 'strong';
  return `${word} ${r > 0 ? 'positive' : 'negative'} link`;
}

export function CorrelationChart({ data, days }: { data: CorrelationResult; days: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { wrapRef, show, hide, node } = useTooltip();
  const { habits, r, n } = data;
  const k = habits.length;
  const labelW = width < 480 ? 96 : 140;
  const cell = Math.max(22, Math.min(48, Math.floor((width - labelW) / Math.max(k - 1, 1)) - 2));

  // Strongest pair, for the takeaway line.
  let top: { i: number; j: number; v: number } | null = null;
  for (let i = 0; i < k; i++)
    for (let j = 0; j < i; j++) {
      const v = r[i][j];
      if (v !== null && (!top || Math.abs(v) > Math.abs(top.v))) top = { i, j, v };
    }

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Habit A</th>
          <th scope="col">Habit B</th>
          <th scope="col">r (phi)</th>
          <th scope="col">Shared days</th>
        </tr>
      </thead>
      <tbody>
        {habits.flatMap((a, i) =>
          habits.slice(0, i).map((b, j) => (
            <tr key={`${a.id}-${b.id}`}>
              <th scope="row">{a.name}</th>
              <td>{b.name}</td>
              <td>{r[i][j] === null ? 'n/a' : r[i][j]!.toFixed(2)}</td>
              <td>{n[i][j]}</td>
            </tr>
          )),
        )}
      </tbody>
    </table>
  );

  return (
    <ChartCard
      title="Habits that move together"
      description={
        <>
          Phi correlation between habits over the last {days} days, from days both were due. Positive means you tend to do them on the same days.
          {top && Math.abs(top.v) >= 0.3 && (
            <>
              {' '}
              Strongest: {habits[top.i].name} and {habits[top.j].name} (r = {top.v.toFixed(2)}).
            </>
          )}
        </>
      }
      table={table}
    >
      <div ref={ref} className="chart">
        {k < 2 ? (
          <EmptyChart>Track at least two habits to compare them.</EmptyChart>
        ) : (
          <div ref={wrapRef} className="chart__wrap">
            <svg width={labelW + (k - 1) * (cell + 2) + 60} height={(k - 1) * (cell + 2) + 90} role="img" aria-label="Correlation matrix between habits">
              {habits.slice(0, -1).map((h, j) => {
                const x = labelW + j * (cell + 2) + cell / 2;
                const y = (k - 1) * (cell + 2) + 8;
                return (
                  <text key={h.id} className="row-label" transform={`translate(${x},${y}) rotate(40)`} dy="0.32em">
                    {truncate(h.name, 14)}
                  </text>
                );
              })}
              {habits.slice(1).map((a, row) => {
                const i = row + 1;
                const y = row * (cell + 2);
                return (
                  <g key={a.id}>
                    <text className="row-label" x={labelW - 8} y={y + cell / 2} dy="0.32em" textAnchor="end">
                      {truncate(a.name, width < 480 ? 11 : 18)}
                    </text>
                    {habits.slice(0, i).map((b, j) => {
                      const v = r[i][j];
                      const x = labelW + j * (cell + 2);
                      const tip = (el: Element) =>
                        show(el, `${a.name} and ${b.name}`, [
                          v === null
                            ? { value: 'n/a', label: `needs ${MIN_CORRELATION_SAMPLES} shared days with variation (has ${n[i][j]})` }
                            : { value: `r = ${v.toFixed(2)}`, label: `${strength(v)}, ${n[i][j]} shared days` },
                        ]);
                      const strong = v !== null && Math.abs(v) >= 0.5;
                      return (
                        <g
                          key={b.id}
                          className="corr-cell"
                          onPointerEnter={(e) => tip(e.currentTarget)}
                          onPointerLeave={hide}
                        >
                          <rect x={x} y={y} width={cell} height={cell} rx={3} fill={v === null ? 'none' : color(v)} className={v === null ? 'cell--na' : undefined} />
                          {cell >= 30 && (
                            <text x={x + cell / 2} y={y + cell / 2} dy="0.32em" textAnchor="middle" className={`cell-value${strong ? ' cell-value--inverse' : ''}`}>
                              {v === null ? '–' : fmt1(v)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
            <ul className="legend">
              <li><span className="legend__key legend__key--rect" style={{ background: 'var(--c-div-neg-3)' }} />Rarely on the same day</li>
              <li><span className="legend__key legend__key--rect" style={{ background: 'var(--c-div-mid)' }} />No link</li>
              <li><span className="legend__key legend__key--rect" style={{ background: 'var(--c-div-pos-3)' }} />Often on the same day</li>
            </ul>
            {node}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
