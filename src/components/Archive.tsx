// The "Paused, deleted and done" section on the You tab: paused habits, Recently deleted
// (restorable for 7 days) and finished to-dos grouped by day.

import { useEffect, useRef, useState } from 'react';
import { formatLong, formatShort, type DateKey } from '../lib/dates';
import { scheduleLabel } from '../lib/engine';
import { MAX_HABITS } from '../lib/schema';
import { daysLeft, isLive, liveHabits, TRASH_DAYS } from '../lib/trash';
import { AREA_LABEL, XP_BY_DIFFICULTY, type Todo } from '../lib/types';
import { useFx } from '../state/fx';
import { useStore } from '../state/store';
import { confirmAction } from './Dialog';
import { confirmDeleteHabit } from './HabitEditor';

export type ArchiveView = 'paused' | 'deleted' | 'done';
export const ARCHIVE_VIEWS: ArchiveView[] = ['paused', 'deleted', 'done'];

const LABEL: Record<ArchiveView, string> = { paused: 'Paused', deleted: 'Deleted', done: 'Done' };

export function Archive({ viewParam }: { viewParam?: string }) {
  const { state } = useStore();
  const ref = useRef<HTMLElement>(null);
  const initial = ARCHIVE_VIEWS.find((v) => v === viewParam);
  const [view, setViewState] = useState<ArchiveView>(initial ?? 'paused');

  // Links like #me/done (from the to-dos card) open that list and scroll to it.
  useEffect(() => {
    if (!initial) return;
    setViewState(initial);
    ref.current?.scrollIntoView({ block: 'start' });
  }, [initial]);

  const setView = (v: ArchiveView) => {
    setViewState(v);
    history.replaceState(null, '', `#me/${v}`);
  };

  const counts: Record<ArchiveView, number> = {
    paused: liveHabits(state).filter((h) => h.archivedOn !== null).length,
    deleted: state.trash.habits.length + state.trash.todos.length,
    done: state.todos.filter((t) => t.doneOn && isLive(t)).length,
  };

  return (
    <section ref={ref} className="archive" aria-labelledby="archive-title">
      <h2 id="archive-title">Paused, deleted and done</h2>
      <div className="segmented archive__tabs" role="tablist" aria-label="Lists">
        {ARCHIVE_VIEWS.map((v) => (
          <button key={v} type="button" role="tab" id={`archive-tab-${v}`} aria-selected={view === v} aria-controls="archive-panel" onClick={() => setView(v)}>
            {LABEL[v]} <span className="archive__count">{counts[v]}</span>
          </button>
        ))}
      </div>
      <div id="archive-panel" role="tabpanel" aria-labelledby={`archive-tab-${view}`}>
        {view === 'paused' && <PausedList />}
        {view === 'deleted' && <DeletedList />}
        {view === 'done' && <DoneList />}
      </div>
    </section>
  );
}

function PausedList() {
  const { state, dispatch, today } = useStore();
  const { toast, undoToast } = useFx();
  const paused = liveHabits(state).filter((h) => h.archivedOn !== null);

  if (paused.length === 0) return <p className="muted archive__empty">No paused habits. Pausing a habit hides it from Today and keeps its history.</p>;

  const clearAll = () => {
    const ids = paused.map((h) => h.id);
    const what = ids.length === 1 ? 'the paused habit' : `all ${ids.length} paused habits`;
    if (!confirmAction(`Move ${what} to Recently deleted? You can restore ${ids.length === 1 ? 'it' : 'them'} for ${TRASH_DAYS} days.`)) return;
    dispatch({ type: 'deletePaused', day: today });
    undoToast(ids.length === 1 ? `Deleted ${paused[0].name}` : `Deleted ${ids.length} paused habits`, () => dispatch({ type: 'restoreDeleted', habits: ids, day: today }));
  };

  return (
    <>
      <ul className="plain-list archive__list">
        {paused.map((h) => (
          <li key={h.id}>
            <div>
              <strong>{h.name}</strong>
              <span className="muted">
                {AREA_LABEL[h.area]}, {scheduleLabel(h)}, paused {formatShort(h.archivedOn!)}
              </span>
            </div>
            <div className="archive__actions">
              <button
                type="button"
                className="btn btn--tiny"
                onClick={() => {
                  dispatch({ type: 'restoreHabit', id: h.id, day: today });
                  toast(`Resumed ${h.name}`, 'It is back on Today.');
                }}
              >
                Resume
              </button>
              <button
                type="button"
                className="btn btn--tiny btn--danger"
                onClick={() => {
                  if (!confirmDeleteHabit(h.name)) return;
                  dispatch({ type: 'deleteHabit', id: h.id, day: today });
                  undoToast(`Deleted ${h.name}`, () => dispatch({ type: 'restoreDeleted', habits: [h.id], day: today }));
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn--tiny btn--danger archive__clear" onClick={clearAll}>
        Clear all
      </button>
    </>
  );
}

interface DeletedRow {
  kind: 'habit' | 'todo';
  id: string;
  name: string;
  deletedOn: DateKey;
  detail: string;
}

function DeletedList() {
  const { state, dispatch, today } = useStore();
  const { toast } = useFx();

  // Newest first. Within a day, the most recent deletion is last in each list, so reverse before sorting.
  const habitsById = new Map(state.habits.map((h) => [h.id, h]));
  const todosById = new Map(state.todos.map((t) => [t.id, t]));
  const rows: DeletedRow[] = [
    ...state.trash.habits.flatMap((d) => {
      const h = habitsById.get(d.id);
      if (!h) return [];
      const days = Object.values(state.logs).filter((day) => d.id in day).length;
      return [{ kind: 'habit' as const, id: d.id, name: h.name, deletedOn: d.deletedOn, detail: `Habit, ${days} ${days === 1 ? 'day' : 'days'} logged` }];
    }),
    ...state.trash.todos.flatMap((d) => {
      const t = todosById.get(d.id);
      return t ? [{ kind: 'todo' as const, id: d.id, name: t.name, deletedOn: d.deletedOn, detail: t.doneOn ? 'To-do, done' : 'To-do' }] : [];
    }),
  ]
    .reverse()
    .sort((a, b) => b.deletedOn.localeCompare(a.deletedOn));

  if (rows.length === 0) return <p className="muted archive__empty">Nothing deleted in the last {TRASH_DAYS} days.</p>;

  const ids = (row: DeletedRow) => (row.kind === 'habit' ? { habits: [row.id] } : { todos: [row.id] });

  const restore = (row: DeletedRow) => {
    if (row.kind === 'habit' && liveHabits(state).length >= MAX_HABITS) return toast("Can't restore", `You can keep up to ${MAX_HABITS} habits. Delete one first.`);
    dispatch({ type: 'restoreDeleted', ...ids(row), day: today });
    toast(`Restored ${row.name}`, row.kind === 'habit' ? 'It is back on Today.' : 'It is back on your to-dos.');
  };

  const remove = (row: DeletedRow) => {
    if (!confirmAction(`Delete "${row.name}" for good? You won't be able to restore it. XP you already earned from it stays.`)) return;
    dispatch({ type: 'deleteForever', ...ids(row) });
  };

  const clearAll = () => {
    if (!confirmAction(`Delete all ${rows.length} items in Recently deleted for good? You won't be able to restore them. XP you already earned from them stays.`)) return;
    dispatch({ type: 'deleteForever' });
  };

  return (
    <>
      <p className="muted archive__note">You can restore deleted habits and to-dos for {TRASH_DAYS} days. XP you earned from them always stays.</p>
      <ul className="plain-list archive__list">
        {rows.map((row) => {
          const left = daysLeft(row.deletedOn, today);
          return (
            <li key={`${row.kind}-${row.id}`}>
              <div>
                <strong>{row.name}</strong>
                <span className="muted">
                  {row.detail}, deleted {formatShort(row.deletedOn)}, {left === 1 ? 'last day' : `${left} days left`}
                </span>
              </div>
              <div className="archive__actions">
                <button type="button" className="btn btn--tiny" onClick={() => restore(row)}>
                  Restore
                </button>
                <button type="button" className="btn btn--tiny btn--danger" onClick={() => remove(row)}>
                  Delete forever
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <button type="button" className="btn btn--tiny btn--danger archive__clear" onClick={clearAll}>
        Clear all
      </button>
    </>
  );
}

const DONE_PAGE = 20;

function DoneList() {
  const { state, dispatch } = useStore();
  const { toast } = useFx();
  const [order, setOrder] = useState<'newest' | 'oldest'>('newest');
  const [limit, setLimit] = useState(DONE_PAGE);

  const done = state.todos
    .filter((t): t is Todo & { doneOn: DateKey } => t.doneOn !== null && isLive(t))
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (order === 'newest' ? b.t.doneOn.localeCompare(a.t.doneOn) : a.t.doneOn.localeCompare(b.t.doneOn)) || a.i - b.i)
    .map((x) => x.t);

  if (done.length === 0) return <p className="muted archive__empty">No finished to-dos yet. Tick one off on Today and it shows up here.</p>;

  // Group the visible slice by the day each to-do was finished.
  const groups: { day: DateKey; todos: Todo[] }[] = [];
  for (const t of done.slice(0, limit)) {
    const last = groups[groups.length - 1];
    if (last?.day === t.doneOn) last.todos.push(t);
    else groups.push({ day: t.doneOn, todos: [t] });
  }

  return (
    <>
      <div className="segmented archive__order" role="radiogroup" aria-label="Order">
        {(['newest', 'oldest'] as const).map((o) => (
          <button key={o} type="button" role="radio" aria-checked={order === o} onClick={() => setOrder(o)}>
            {o === 'newest' ? 'Newest first' : 'Oldest first'}
          </button>
        ))}
      </div>
      {groups.map((g) => (
        <div key={g.day} className="archive__day">
          <h3>{formatLong(g.day)}</h3>
          <ul className="plain-list archive__list">
            {g.todos.map((t) => (
              <li key={t.id}>
                <div>
                  <strong>{t.name}</strong>
                  <span className="muted">
                    {t.difficulty[0].toUpperCase() + t.difficulty.slice(1)}, +{XP_BY_DIFFICULTY[t.difficulty]} XP
                  </span>
                </div>
                <div className="archive__actions">
                  <button
                    type="button"
                    className="btn btn--tiny"
                    onClick={() => {
                      dispatch({ type: 'toggleTodo', id: t.id, day: g.day });
                      toast(`${t.name} is back on your to-dos`);
                    }}
                  >
                    Not done
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {done.length > limit && (
        <button type="button" className="btn btn--tiny archive__more" onClick={() => setLimit(limit + DONE_PAGE)}>
          Show more ({done.length - limit} left)
        </button>
      )}
    </>
  );
}
