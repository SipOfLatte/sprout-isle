// Moving between days: a week strip for nearby days and a month calendar for
// jumping further back. Each day shows how much of it got done.

import { useState } from 'react';
import { dailySeries, type DailyPoint } from '../lib/analytics';
import { dayTally } from '../lib/engine';
import {
  addDays,
  endOfMonth,
  formatLong,
  formatMonth,
  fromKey,
  startOfMonth,
  startOfWeek,
  WEEKDAY_LETTER,
  WEEKDAY_SHORT,
  weekday,
  type DateKey,
} from '../lib/dates';
import { firstDay } from '../lib/engine';
import type { AppState } from '../lib/types';
import { useStore } from '../state/store';
import { Dialog } from './Dialog';
import { Icon } from './Icon';

interface DayInfo {
  /** Share of habits finished, 1 if only to-dos were done, null if nothing was due or logged. */
  level: number | null;
  label: string;
}

/** Uses the same count as the day's own page, so the two always agree. */
function dayInfo(state: AppState, p: DailyPoint): DayInfo {
  const { due, done } = dayTally(state, p.day);
  if (due > 0) return { level: done / due, label: `${done} of ${due} done` };
  const logged = Object.keys(state.logs[p.day] ?? {}).length > 0 || state.todos.some((t) => t.doneOn === p.day);
  return logged ? { level: 1, label: 'Something logged' } : { level: null, label: 'Nothing logged' };
}

export function WeekStrip({ day, onSelect }: { day: DateKey; onSelect: (d: DateKey) => void }) {
  const { state, today } = useStore();
  const weekStart = startOfWeek(day);
  const points = dailySeries(state, weekStart, addDays(weekStart, 6), today, 'all');
  const earliest = firstDay(state, today);

  return (
    <div className="week-strip">
      <button
        type="button"
        className="icon-btn"
        onClick={() => onSelect(addDays(day, -7))}
        disabled={addDays(weekStart, -1) < earliest}
        aria-label="Previous week"
      >
        <Icon name="left" size={12} />
      </button>

      <ol className="week-strip__days">
        {points.map((p) => {
          const future = p.day > today;
          const info = future ? null : dayInfo(state, p);
          const level = info?.level ?? null;
          const selected = p.day === day;
          return (
            <li key={p.day}>
              <button
                type="button"
                className={`day-chip${selected ? ' is-selected' : ''}${p.day === today ? ' is-today' : ''}`}
                onClick={() => onSelect(p.day)}
                disabled={future}
                aria-pressed={selected}
                aria-label={`${formatLong(p.day)}${p.day === today ? ', today' : ''}. ${info ? info.label : 'Upcoming'}`}
              >
                <span className="day-chip__wd">{WEEKDAY_LETTER[weekday(p.day)]}</span>
                <span className="day-chip__num">{fromKey(p.day).getDate()}</span>
                <span className="day-chip__meter" aria-hidden="true">
                  <span style={{ width: `${Math.round((level ?? 0) * 100)}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        className="icon-btn"
        onClick={() => onSelect(addDays(day, 7) > today ? today : addDays(day, 7))}
        disabled={addDays(weekStart, 7) > today}
        aria-label="Next week"
      >
        <Icon name="right" size={12} />
      </button>

    </div>
  );
}

/** Opens the month calendar. Lives in the day header so it sits with the other day controls. */
export function CalendarButton({ day, onSelect }: { day: DateKey; onSelect: (d: DateKey) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn btn--tiny" onClick={() => setOpen(true)} aria-label="Open calendar">
        <Icon name="calendar" size={12} />
        {/* The word is dropped on narrow screens; the icon and aria-label still say what it does. */}
        <span className="hide-narrow">Calendar</span>
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Go to a day">
        {open && (
          <MonthPicker
            day={day}
            onSelect={(d) => {
              setOpen(false);
              onSelect(d);
            }}
          />
        )}
      </Dialog>
    </>
  );
}

function MonthPicker({ day, onSelect }: { day: DateKey; onSelect: (d: DateKey) => void }) {
  const { state, today } = useStore();
  const [month, setMonth] = useState(startOfMonth(day));
  const earliest = firstDay(state, today);
  const end = endOfMonth(month);
  const points = dailySeries(state, month, end, today, 'all');
  const lead = weekday(month);

  const step = (level: number | null) => (level === null ? '' : level >= 1 ? ' lv-4' : level >= 0.66 ? ' lv-3' : level >= 0.33 ? ' lv-2' : level > 0 ? ' lv-1' : ' lv-0');

  return (
    <div className="month-picker">
      <div className="month-picker__head">
        <button type="button" className="icon-btn" onClick={() => setMonth(startOfMonth(addDays(month, -1)))} disabled={addDays(month, -1) < earliest} aria-label="Previous month">
          <Icon name="left" size={12} />
        </button>
        <span className="month-picker__title" aria-live="polite">
          {formatMonth(month)}
        </span>
        <button type="button" className="icon-btn" onClick={() => setMonth(addDays(end, 1))} disabled={addDays(end, 1) > today} aria-label="Next month">
          <Icon name="right" size={12} />
        </button>
      </div>

      <div className="month-grid">
        <div className="month-grid__row">
          {WEEKDAY_SHORT.map((w) => (
            <span key={w} className="month-grid__wd" aria-hidden="true">
              {w.slice(0, 2)}
            </span>
          ))}
        </div>
        {Array.from({ length: Math.ceil((lead + points.length) / 7) }, (_, row) => (
          <div className="month-grid__row" key={row}>
            {Array.from({ length: 7 }, (_, col) => {
              const p = points[row * 7 + col - lead];
              if (!p) return <span key={col} />;
              const outOfRange = p.day > today || p.day < earliest;
              const info = outOfRange ? null : dayInfo(state, p);
              const level = info?.level ?? null;
              return (
                <span key={col}>
                  <button
                    type="button"
                    className={`month-day${step(level)}${p.day === day ? ' is-selected' : ''}${p.day === today ? ' is-today' : ''}`}
                    disabled={outOfRange}
                    onClick={() => onSelect(p.day)}
                    aria-label={`${formatLong(p.day)}. ${info ? info.label : 'No data'}`}
                  >
                    {fromKey(p.day).getDate()}
                  </button>
                </span>
              );
            })}
          </div>
        ))}
      </div>

      <ul className="legend month-picker__legend">
        <li>
          <span className="legend__key legend__key--rect" style={{ background: 'var(--c-track)' }} />
          Nothing done
        </li>
        <li>
          <span className="legend__key legend__key--rect" style={{ background: 'var(--c-seq-2)' }} />
          Some
        </li>
        <li>
          <span className="legend__key legend__key--rect" style={{ background: 'var(--c-seq-4)' }} />
          Everything
        </li>
      </ul>
      <button type="button" className="btn btn--tiny" onClick={() => onSelect(today)}>
        Go to today
      </button>
    </div>
  );
}
