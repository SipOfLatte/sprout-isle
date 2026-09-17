// Average mood or energy for each weekday over the last 12 weeks. One measure highlights the
// best day; both measures are drawn as side-by-side columns.

import { scaleBand, scaleLinear } from 'd3-scale';
import { WEEKDAY_SHORT } from '../lib/dates';
import { MEASURE_COLOR, MEASURE_NAME, type Measure } from '../lib/wellbeing';
import { ChartCard, columnPath, EmptyChart, Legend, useTooltip, useWidth } from './common';

const HEIGHT = 240;
const M = { top: 22, right: 8, bottom: 26, left: 8 };
/** Fewer than this many check-ins on a weekday isn't worth drawing. */
const MIN_SAMPLES = 3;

interface Point {
  weekday: number;
  mean: number | null;
  n: number;
}

export interface WeekdaySeries {
  measure: Measure;
  points: Point[];
}

const usable = (p: Point) => p.mean !== null && p.n >= MIN_SAMPLES;

export function WeekdayRatingChart({ series }: { series: WeekdaySeries[] }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const { wrapRef, show, hide, node } = useTooltip();
  const paired = series.length > 1;
  const names = series.map((s) => s.measure).join(' and ');

  const single = series[0];
  const valid = single.points.filter(usable);
  const best = !paired && valid.length ? valid.reduce((a, b) => (b.mean! > a.mean! ? b : a)) : null;
  const worst = !paired && valid.length ? valid.reduce((a, b) => (b.mean! < a.mean! ? b : a)) : null;
  const hasData = series.some((s) => s.points.some(usable));

  const x = scaleBand<number>().domain([0, 1, 2, 3, 4, 5, 6]).range([M.left, width - M.right]).paddingInner(0.3);
  // Ratings start at 1, so columns grow from 1 rather than 0.
  const y = scaleLinear().domain([1, 5]).range([HEIGHT - M.bottom, M.top]);
  const gap = 2;
  const bw = Math.min(paired ? 14 : 24, (x.bandwidth() - (paired ? gap : 0)) / series.length);

  const table = (
    <table>
      <thead>
        <tr>
          <th scope="col">Weekday</th>
          {series.map((s) => (
            <th scope="col" key={s.measure}>
              Average {s.measure} (check-ins)
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {WEEKDAY_SHORT.map((name, wd) => (
          <tr key={name}>
            <th scope="row">{name}</th>
            {series.map((s) => {
              const p = s.points[wd];
              return (
                <td key={s.measure}>
                  {p.mean === null ? 'n/a' : p.mean.toFixed(2)} ({p.n})
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );

  const description = paired
    ? 'Last 12 weeks. The scale starts at 1.'
    : best && worst && best !== worst
      ? `Last 12 weeks. Highest on ${WEEKDAY_SHORT[best.weekday]}, lowest on ${WEEKDAY_SHORT[worst.weekday]}. The scale starts at 1.`
      : `Average ${single.measure} per weekday over the last 12 weeks. The scale starts at 1.`;

  return (
    <ChartCard
      title={`${MEASURE_NAME[single.measure]}${paired ? ' and energy' : ''} by weekday`}
      description={description}
      legend={paired && <Legend items={series.map((s) => ({ label: MEASURE_NAME[s.measure], color: MEASURE_COLOR[s.measure] }))} />}
      table={table}
    >
      <div ref={ref} className="chart">
        {!hasData ? (
          <EmptyChart>Needs a few weeks of check-ins.</EmptyChart>
        ) : (
          <div ref={wrapRef} className="chart__wrap">
            <svg width={width} height={HEIGHT} role="img" aria-label={`Column chart of average ${names} by weekday`}>
              {WEEKDAY_SHORT.map((name, wd) => {
                const center = (x(wd) ?? 0) + x.bandwidth() / 2;
                const groupW = bw * series.length + (paired ? gap : 0);
                const tip = (el: Element) =>
                  show(
                    el,
                    name,
                    series.map((s) => {
                      const p = s.points[wd];
                      return { value: usable(p) ? p.mean!.toFixed(2) : 'n/a', label: `${s.measure}, ${p.n} check-ins`, key: MEASURE_COLOR[s.measure] };
                    }),
                  );
                return (
                  <g key={name}>
                    {series.map((s, si) => {
                      const p = s.points[wd];
                      if (!usable(p)) return null;
                      const left = center - groupW / 2 + si * (bw + gap);
                      const fill = paired || best?.weekday === wd ? MEASURE_COLOR[s.measure] : 'var(--c-muted-mark)';
                      return (
                        <g key={s.measure}>
                          <path d={columnPath(left, y(p.mean!), bw, y(1) - y(p.mean!))} fill={fill} />
                          {!paired && (
                            <text className="value" x={center} y={y(p.mean!) - 6} textAnchor="middle">
                              {p.mean!.toFixed(1)}
                            </text>
                          )}
                        </g>
                      );
                    })}
                    <text className="axis" x={center} y={HEIGHT - 8} textAnchor="middle">
                      {name}
                    </text>
                    <rect
                      className="hit"
                      x={x(wd)}
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
