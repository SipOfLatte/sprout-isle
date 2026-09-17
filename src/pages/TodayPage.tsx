import { useRef, useState, type FormEvent } from 'react';
import { HabitEditor, type HabitDraft } from '../components/HabitEditor';
import { HabitRow } from '../components/HabitRow';
import { Icon } from '../components/Icon';
import { Isle } from '../components/Isle';
import { PlayerBar } from '../components/PlayerBar';
import { addDays, diffDays, formatLong, type DateKey } from '../lib/dates';
import { amountOn, isActiveOn, isDone, isDueOn } from '../lib/engine';
import { AREA_LABEL, XP_BY_DIFFICULTY, type Area, type Difficulty, type Habit } from '../lib/types';
import { useFx } from '../state/fx';
import { useStore } from '../state/store';

const MAX_BACKFILL_DAYS = 7;

const STARTERS: (HabitDraft & { name: string })[] = [
  { name: 'Walk 20 minutes', area: 'health', difficulty: 'easy', schedule: { kind: 'daily' } },
  { name: 'Drink water', area: 'health', difficulty: 'medium', schedule: { kind: 'daily' }, target: 8, unit: 'glasses' },
  { name: 'In bed by 11:30', area: 'health', difficulty: 'medium', schedule: { kind: 'daily' } },
  { name: 'Deep work block', area: 'work', difficulty: 'hard', schedule: { kind: 'weekdays', days: [0, 1, 2, 3, 4] } },
  { name: 'Study session', area: 'work', difficulty: 'medium', schedule: { kind: 'weekly', times: 4 } },
  { name: 'Plan tomorrow', area: 'work', difficulty: 'easy', schedule: { kind: 'daily' } },
];

export function TodayPage({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { state, today, progress } = useStore();
  const [day, setDay] = useState<DateKey>(today);
  const [editing, setEditing] = useState<{ habit: Habit | null; preset?: HabitDraft } | null>(null);

  const viewDay = day > today ? today : day;
  const isToday = viewDay === today;
  const daysBack = diffDays(viewDay, today);

  const active = state.habits.filter((h) => isActiveOn(h, viewDay));
  const due = active.filter((h) => isDueOn(h, viewDay));
  const other = active.filter((h) => !isDueOn(h, viewDay));
  const doneCount = due.filter((h) => isDone(h, amountOn(state, h.id, viewDay))).length;
  const dayXp = progress.dailyXp[viewDay];
  const xpToday = dayXp ? dayXp.health + dayXp.work + dayXp.bonus : 0;

  return (
    <div className="today">
      <aside className="today__world">
        <div className="world-card">
          <Isle variant="banner" register />
          <PlayerBar />
        </div>
      </aside>

      <section className="today__main" aria-labelledby="day-title">
        {state.isSample && (
          <p className="notice">
            You're looking at sample data.{' '}
            <button type="button" className="link" onClick={() => onNavigate('me')}>
              Start your own
            </button>
          </p>
        )}

        <header className="day-head">
          <div>
            <h1 id="day-title">{isToday ? 'Today' : daysBack === 1 ? 'Yesterday' : `${daysBack} days ago`}</h1>
            <p className="day-head__date">{formatLong(viewDay)}</p>
          </div>
          <div className="day-nav">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setDay(addDays(viewDay, -1))}
              disabled={daysBack >= MAX_BACKFILL_DAYS}
              aria-label="Previous day"
            >
              <Icon name="left" size={12} />
            </button>
            <button type="button" className="icon-btn" onClick={() => setDay(addDays(viewDay, 1))} disabled={isToday} aria-label="Next day">
              <Icon name="right" size={12} />
            </button>
          </div>
        </header>

        {state.habits.length === 0 ? (
          <div className="empty">
            <h2>Plant your first habit</h2>
            <p>Pick a starter or make your own. Each one you finish grows part of your island.</p>
            <div className="starters">
              {STARTERS.map((s) => (
                <button key={s.name} type="button" className={`starter starter--${s.area}`} onClick={() => setEditing({ habit: null, preset: s })}>
                  <Icon name={s.area === 'health' ? 'leaf' : 'book'} size={12} />
                  {s.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            <p className="day-summary">
              {due.length === 0
                ? 'Nothing scheduled. A good day for a to-do.'
                : doneCount === due.length
                  ? `All ${due.length} done. Your island thanks you.`
                  : `${doneCount} of ${due.length} done`}
              {xpToday > 0 && <span className="day-summary__xp">+{xpToday} XP</span>}
            </p>
            <ul className="habit-list">
              {due.map((h) => (
                <HabitRow key={h.id} habit={h} day={viewDay} onEdit={(habit) => setEditing({ habit })} />
              ))}
            </ul>
            {other.length > 0 && (
              <details className="others">
                <summary>Not scheduled {isToday ? 'today' : 'this day'} ({other.length})</summary>
                <ul className="habit-list">
                  {other.map((h) => (
                    <HabitRow key={h.id} habit={h} day={viewDay} onEdit={(habit) => setEditing({ habit })} />
                  ))}
                </ul>
              </details>
            )}
          </>
        )}

        <button type="button" className="btn btn--add" onClick={() => setEditing({ habit: null })}>
          <Icon name="plus" size={10} /> New habit
        </button>

        <Todos day={viewDay} />
      </section>

      <HabitEditor open={editing !== null} habit={editing?.habit ?? null} preset={editing?.preset} onClose={() => setEditing(null)} />
    </div>
  );
}

function Todos({ day }: { day: DateKey }) {
  const { state, dispatch } = useStore();
  const { launchSeed } = useFx();
  const [name, setName] = useState('');
  const [area, setArea] = useState<Area>('work');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const inputRef = useRef<HTMLInputElement>(null);

  const visible = state.todos.filter((t) => (t.doneOn ? t.doneOn === day : t.createdOn <= day));

  const add = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({ type: 'addTodo', name: trimmed.slice(0, 80), area, difficulty, day });
    setName('');
    inputRef.current?.focus();
  };

  return (
    <section className="todos" aria-labelledby="todos-title">
      <h2 id="todos-title">To-dos</h2>
      <form className="todo-add" onSubmit={add}>
        <label className="visually-hidden" htmlFor="todo-name">
          New to-do
        </label>
        <input id="todo-name" ref={inputRef} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Add a one-off task" />
        <select value={area} onChange={(e) => setArea(e.target.value as Area)} aria-label="Part of life">
          <option value="health">{AREA_LABEL.health}</option>
          <option value="work">{AREA_LABEL.work}</option>
        </select>
        <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)} aria-label="Effort">
          <option value="easy">Easy +10</option>
          <option value="medium">Medium +20</option>
          <option value="hard">Hard +35</option>
        </select>
        <button type="submit" className="btn">
          Add
        </button>
      </form>

      {visible.length === 0 ? (
        <p className="muted">No to-dos. Add anything you keep putting off.</p>
      ) : (
        <ul className="habit-list">
          {visible.map((t) => (
            <li key={t.id} className={`habit habit--${t.area}${t.doneOn ? ' is-done' : ''}`}>
              <button
                type="button"
                className="check"
                aria-pressed={!!t.doneOn}
                aria-label={`${t.name}${t.doneOn ? ', done' : ''}`}
                onClick={(e) => {
                  if (!t.doneOn) launchSeed(e.currentTarget, t.area);
                  dispatch({ type: 'toggleTodo', id: t.id, day });
                }}
              >
                {t.doneOn && <Icon name="check" size={16} />}
              </button>
              <div className="habit__body">
                <span className="habit__name">{t.name}</span>
                <span className="habit__meta">
                  <span className="area-tag">
                    <Icon name={t.area === 'health' ? 'leaf' : 'book'} size={11} />
                    {AREA_LABEL[t.area]}
                  </span>
                </span>
              </div>
              <div className="habit__side">
                <span className="xp-chip">+{XP_BY_DIFFICULTY[t.difficulty]}</span>
                <button type="button" className="icon-btn" onClick={() => dispatch({ type: 'deleteTodo', id: t.id })} aria-label={`Delete ${t.name}`}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
