// The Insights tab: a Habits view and a Mood & energy view sharing one filter row.

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
import { addDays, diffDays, minKey, type DateKey } from '../lib/dates';
import { mean } from '../lib/stats';
import { completionVsRating, habitEffects, LOOKBACK_DAYS, weekdayRatings, wellbeingSeries, wellbeingSummary, type Measure } from '../lib/wellbeing';
import { CompletionScatter } from '../charts/CompletionScatter';
import { HabitEffectsChart } from '../charts/HabitEffectsChart';
import { MoodTrendChart } from '../charts/MoodTrendChart';
import { WeekdayRatingChart } from '../charts/WeekdayRatingChart';
import { useStore } from '../state/store';

const RHYTHM_WEEKS = 12;
const CORRELATION_DAYS = 60;

export function InsightsPage({ viewParam }: { viewParam?: string }) {
  const { state, progress, today } = useStore();
  const [kind, setKind] = useState<PeriodKind>('week');
  const [anchor, setAnchor] = useState(today);
  const [area, setArea] = useState<AreaFilter>('all');
  const [view, setViewState] = useState<'habits' | 'wellbeing'>(viewParam === 'mood' ? 'wellbeing' : 'habits');
  const setView = (v: 'habits' | 'wellbeing') => {
    setViewState(v);
    // Keep the view in the address so it can be bookmarked, without adding history entries.
    history.replaceState(null, '', `#insights${v === 'wellbeing' ? '/mood' : ''}`);
  };
  const [measure, setMeasure] = useState<Measure>('mood');

  const period = periodFor(kind, anchor);
  const isCurrent = period.start <= today && today <= period.end;
  const monthly = kind === 'month';

  // Compare like with like: if we're 3 days into this week, compare to the first 3 days of last week.
  const prev = shiftPeriod(period, -1);
  const elapsed = diffDays(period.start, minKey(period.end, today));
  const prevSlice = { start: prev.start, end: minKey(prev.end, addDays(prev.start, elapsed)) };

  const data = useMemo(() => {
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

      <div className="segmented insight-tabs" role="tablist" aria-label="Insight views">
        <button type="button" role="tab" aria-selected={view === 'habits'} onClick={() => setView('habits')}>
          Habits
        </button>
        <button type="button" role="tab" aria-selected={view === 'wellbeing'} onClick={() => setView('wellbeing')}>
          Mood & energy
        </button>
      </div>

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
        {view === 'wellbeing' && (
          <div className="segmented" role="radiogroup" aria-label="Measure">
            {(['mood', 'energy'] as const).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={measure === m} onClick={() => setMeasure(m)}>
                {m === 'mood' ? 'Mood' : 'Energy'}
              </button>
            ))}
          </div>
        )}
      </div>

      {view === 'wellbeing' ? (
        <WellbeingView period={period} prevSlice={prevSlice} area={area} measure={measure} kind={kind} isCurrent={isCurrent} />
      ) : state.habits.length === 0 ? (
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

/** The Mood & energy view. Stat tiles and the trend follow the period filter; the other charts look back 90 days. */
function WellbeingView({
  period,
  prevSlice,
  area,
  measure,
  kind,
  isCurrent,
}: {
  period: { start: DateKey; end: DateKey };
  prevSlice: { start: DateKey; end: DateKey };
  area: AreaFilter;
  measure: Measure;
  kind: PeriodKind;
  isCurrent: boolean;
}) {
  const { state, today } = useStore();

  const data = useMemo(
    () => ({
      now: wellbeingSummary(state, period.start, period.end, today),
      before: wellbeingSummary(state, prevSlice.start, prevSlice.end, today),
      series: wellbeingSeries(state, period.start, period.end, today),
      effects: habitEffects(state, today, measure, area),
      scatter: completionVsRating(state, today, measure, area),
      weekdays: weekdayRatings(state, today, measure),
    }),
    [state, today, period.start, period.end, prevSlice.start, prevSlice.end, measure, area],
  );

  if (Object.keys(state.checkins).length === 0) {
    return (
      <p className="empty">
        Check in with your mood and energy on the Today page. After a week or two, this shows your trends and which habits line up with your better days.
      </p>
    );
  }

  const { now, before, weekdays } = data;
  // Last 90 days: days where every scheduled habit was finished vs the rest.
  const perfect = data.scatter.points.filter((p) => p.score === 1).map((p) => p.rating);
  const others = data.scatter.points.filter((p) => p.score < 1).map((p) => p.rating);
  const oneDp = (a: number | null, b: number | null) => (a === null || b === null ? null : Math.round((a - b) * 10) / 10);

  return (
    <>
      <div className="kpis">
        <Kpi label="Average mood" value={now.mood === null ? 'n/a' : `${now.mood.toFixed(1)} / 5`} delta={oneDp(now.mood, before.mood)} kind={kind} isCurrent={isCurrent} />
        <Kpi label="Average energy" value={now.energy === null ? 'n/a' : `${now.energy.toFixed(1)} / 5`} delta={oneDp(now.energy, before.energy)} kind={kind} isCurrent={isCurrent} />
        <Kpi label="Days checked in" value={`${now.checkedIn} of ${now.days}`} delta={null} kind={kind} isCurrent={isCurrent} />
        <Kpi
          label={`${measure === 'mood' ? 'Mood' : 'Energy'}: perfect days vs others`}
          value={perfect.length && others.length ? `${mean(perfect)!.toFixed(1)} vs ${mean(others)!.toFixed(1)}` : 'n/a'}
          delta={null}
          kind={kind}
          isCurrent={isCurrent}
        />
      </div>

      <div className="chart-grid">
        <MoodTrendChart points={data.series} monthly={kind === 'month'} />
        <HabitEffectsChart effects={data.effects} measure={measure} />
        <CompletionScatter points={data.scatter.points} fit={data.scatter.fit} measure={measure} />
        <WeekdayRatingChart points={weekdays} measure={measure} />
      </div>
      <p className="footnote">
        Habit effects and the scatter plot look back {LOOKBACK_DAYS} days from today, and the weekday chart 12 weeks, so they don't change with the period filter.
      </p>
    </>
  );
}

/** A stat tile. The delta compares against the same number of elapsed days in the previous period. */
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
