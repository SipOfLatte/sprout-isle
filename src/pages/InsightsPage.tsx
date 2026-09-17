import { useMemo, useState } from 'react';
import { CompletionChart } from '../charts/CompletionChart';
import { CorrelationChart } from '../charts/CorrelationChart';
import { HabitBars } from '../charts/HabitBars';
import { HabitGrid } from '../charts/HabitGrid';
import { WeekdayChart } from '../charts/WeekdayChart';
import { XpChart } from '../charts/XpChart';
import { Icon } from '../components/Icon';
import {
  correlations,
  dailySeries,
  habitGrid,
  habitRates,
  periodFor,
  rollingMean,
  shiftPeriod,
  summarize,
  tidyRows,
  weekdayProfile,
  xpSeries,
  type AreaFilter,
  type PeriodKind,
} from '../lib/analytics';
import { toCsv, downloadText } from '../lib/csv';
import { addDays, diffDays, minKey } from '../lib/dates';
import { useStore } from '../state/store';

const RHYTHM_WEEKS = 12;
const CORRELATION_DAYS = 60;

export function InsightsPage() {
  const { state, progress, today } = useStore();
  const [kind, setKind] = useState<PeriodKind>('week');
  const [anchor, setAnchor] = useState(today);
  const [area, setArea] = useState<AreaFilter>('all');

  const period = periodFor(kind, anchor);
  const isCurrent = period.start <= today && today <= period.end;
  const monthly = kind === 'month';

  const data = useMemo(() => {
    // Compare like with like: if we're 3 days into this week, compare to the first 3 days of last week.
    const prev = shiftPeriod(period, -1);
    const elapsed = diffDays(period.start, minKey(period.end, today));
    const prevSlice = { start: prev.start, end: minKey(prev.end, addDays(prev.start, elapsed)) };
    // Pull 6 extra days so the first rolling-average point has a full window.
    const extended = dailySeries(state, addDays(period.start, -6), period.end, today, area);
    const avg = rollingMean(extended.map((p) => p.score), 7).slice(6);
    return {
      summary: summarize(state, progress, period, today, area),
      previous: summarize(state, progress, prevSlice, today, area),
      points: extended.slice(6),
      avg,
      rates: habitRates(state, period.start, period.end, today, area),
      grid: habitGrid(state, period.start, period.end, today, area),
      xp: xpSeries(progress, period.start, period.end).map((p) =>
        area === 'all' ? p : { ...p, health: area === 'health' ? p.health : 0, work: area === 'work' ? p.work : 0, bonus: 0 },
      ),
      rhythm: weekdayProfile(state, today, RHYTHM_WEEKS, area),
      corr: correlations(state, today, CORRELATION_DAYS, area),
    };
  }, [state, progress, today, area, period.start, period.end]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportCsv = () => {
    const csv = toCsv(tidyRows(state, today));
    downloadText(`habit-log-${today}.csv`, csv, 'text/csv');
  };

  const { summary, previous } = data;
  const delta = (a: number | null, b: number | null, unit: 'pts' | 'n') => {
    if (a === null || b === null) return null;
    const d = unit === 'pts' ? Math.round((a - b) * 100) : a - b;
    return d;
  };

  return (
    <div className="insights">
      <header className="page-head">
        <h1>Insights</h1>
        <button type="button" className="btn btn--tiny" onClick={exportCsv} disabled={state.habits.length === 0}>
          Export CSV
        </button>
      </header>

      <div className="filters" role="group" aria-label="Filters">
        <div className="segmented" role="radiogroup" aria-label="Period length">
          {(['week', 'month'] as const).map((k) => (
            <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}>
              {k === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
        <div className="period-nav">
          <button type="button" className="icon-btn" onClick={() => setAnchor(shiftPeriod(period, -1).start)} aria-label={`Previous ${kind}`}>
            <Icon name="left" size={12} />
          </button>
          <span className="period-nav__label" aria-live="polite">
            {period.label}
          </span>
          <button type="button" className="icon-btn" onClick={() => setAnchor(shiftPeriod(period, 1).start)} disabled={isCurrent} aria-label={`Next ${kind}`}>
            <Icon name="right" size={12} />
          </button>
          {!isCurrent && (
            <button type="button" className="link" onClick={() => setAnchor(today)}>
              {kind === 'week' ? 'This week' : 'This month'}
            </button>
          )}
        </div>
        <div className="segmented" role="radiogroup" aria-label="Part of life">
          {([
            ['all', 'All'],
            ['health', 'Health'],
            ['work', 'Work'],
          ] as const).map(([k, label]) => (
            <button key={k} type="button" role="radio" aria-checked={area === k} onClick={() => setArea(k)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {state.habits.length === 0 ? (
        <p className="empty">Your charts appear once you've tracked a habit or two. Want to explore first? Load sample data from the Me tab.</p>
      ) : (
        <>
          <div className="kpis">
            <Kpi label="Completion" value={summary.score === null ? 'n/a' : `${Math.round(summary.score * 100)}%`} delta={delta(summary.score, previous.score, 'pts')} unit=" pts" kind={kind} isCurrent={isCurrent} />
            <Kpi label="XP earned" value={summary.xp.toLocaleString()} delta={delta(summary.xp, previous.xp, 'n')} kind={kind} isCurrent={isCurrent} />
            <Kpi label="Perfect days" value={String(summary.perfectDays)} delta={delta(summary.perfectDays, previous.perfectDays, 'n')} kind={kind} isCurrent={isCurrent} />
            <Kpi label="Habits completed" value={String(summary.checkIns)} delta={delta(summary.checkIns, previous.checkIns, 'n')} kind={kind} isCurrent={isCurrent} />
          </div>

          <div className="chart-grid">
            <CompletionChart points={data.points} avg={data.avg} monthly={monthly} />
            <HabitGrid rows={data.grid} />
            <HabitBars rates={data.rates} />
            <XpChart points={data.xp} monthly={monthly} />
            <WeekdayChart points={data.rhythm} weeks={RHYTHM_WEEKS} />
            <CorrelationChart data={data.corr} days={CORRELATION_DAYS} />
          </div>
          <p className="footnote">
            Weekly rhythm and correlations always look back from today, so they don't change with the period filter.
          </p>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, delta, unit = '', kind, isCurrent }: { label: string; value: string; delta: number | null; unit?: string; kind: PeriodKind; isCurrent: boolean }) {
  return (
    <div className="kpi">
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
      {delta !== null && (
        <span className={`kpi__delta${delta > 0 ? ' is-up' : delta < 0 ? ' is-down' : ''}`}>
          {delta > 0 ? '+' : delta < 0 ? '−' : '±'}
          {Math.abs(delta)}
          {unit} vs {isCurrent ? `same point last ${kind}` : `previous ${kind}`}
        </span>
      )}
    </div>
  );
}
