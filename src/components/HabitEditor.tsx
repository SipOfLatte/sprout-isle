// Create and edit habits: name, area, how it's measured, schedule and effort.

import { useState, type FormEvent } from 'react';
import { WEEKDAY_SHORT } from '../lib/dates';
import { newId } from '../lib/storage';
import { MAX_HABITS } from '../lib/schema';
import { AREA_LABEL, XP_BY_DIFFICULTY, type Area, type Difficulty, type Habit, type Schedule } from '../lib/types';
import { useFx } from '../state/fx';
import { useStore } from '../state/store';
import { confirmAction, Dialog } from './Dialog';

/** Shared by the editor and the Paused list so both ask the same question. */
export function confirmDeleteHabit(name: string): boolean {
  return confirmAction(`Delete "${name}"? It moves to Recently deleted on the You tab, where you can restore it with its history for 7 days.`);
}

export type HabitDraft = Partial<Pick<Habit, 'name' | 'area' | 'schedule' | 'target' | 'unit' | 'difficulty'>>;

export function HabitEditor({
  open,
  habit,
  preset,
  onClose,
}: {
  open: boolean;
  habit: Habit | null;
  preset?: HabitDraft;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title={habit ? 'Edit habit' : 'New habit'}>
      {open && <HabitForm key={habit?.id ?? 'new'} habit={habit} preset={preset} onClose={onClose} />}
    </Dialog>
  );
}

function HabitForm({ habit, preset, onClose }: { habit: Habit | null; preset?: HabitDraft; onClose: () => void }) {
  const { state, dispatch, today } = useStore();
  const { undoToast } = useFx();
  const init = habit ?? preset ?? {};

  const [name, setName] = useState(init.name ?? '');
  const [area, setArea] = useState<Area>(init.area ?? 'health');
  const [measured, setMeasured] = useState((init.target ?? 1) > 1);
  const [target, setTarget] = useState(String(init.target && init.target > 1 ? init.target : 8));
  const [unit, setUnit] = useState(init.unit ?? '');
  const [kind, setKind] = useState<Schedule['kind']>(init.schedule?.kind ?? 'daily');
  const [days, setDays] = useState<number[]>(init.schedule?.kind === 'weekdays' ? init.schedule.days : [0, 1, 2, 3, 4]);
  const [times, setTimes] = useState(init.schedule?.kind === 'weekly' ? init.schedule.times : 3);
  const [difficulty, setDifficulty] = useState<Difficulty>(init.difficulty ?? 'medium');
  const [error, setError] = useState<string | null>(null);

  // Validation runs here instead of with native form checks, so the messages match the app's wording.
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const targetNum = measured ? Number(target) : 1;
    if (!trimmed) return setError('Give the habit a name.');
    if (measured && (!Number.isInteger(targetNum) || targetNum < 2 || targetNum > 10_000))
      return setError('Set a daily amount between 2 and 10,000.');
    if (kind === 'weekdays' && days.length === 0) return setError('Pick at least one day.');
    if (!habit && state.habits.length >= MAX_HABITS) return setError(`You can keep up to ${MAX_HABITS} habits.`);

    const schedule: Schedule =
      kind === 'daily' ? { kind } : kind === 'weekdays' ? { kind, days: [...days].sort() } : { kind, times };

    dispatch({
      type: 'saveHabit',
      habit: {
        id: habit?.id ?? newId(),
        name: trimmed.slice(0, 60),
        area,
        schedule,
        target: targetNum,
        unit: measured ? unit.trim().slice(0, 20) : '',
        difficulty,
        createdOn: habit?.createdOn ?? today,
        archivedOn: habit?.archivedOn ?? null,
      },
    });
    onClose();
  };

  const archive = () => {
    if (!habit) return;
    dispatch({ type: 'archiveHabit', id: habit.id, day: today });
    undoToast(`Paused ${habit.name}`, () => dispatch({ type: 'restoreHabit', id: habit.id }), 'Find it on the You tab.');
    onClose();
  };

  const remove = () => {
    if (!habit) return;
    if (!confirmDeleteHabit(habit.name)) return;
    dispatch({ type: 'deleteHabit', id: habit.id, day: today });
    undoToast(`Deleted ${habit.name}`, () => dispatch({ type: 'restoreDeleted', habits: [habit.id] }));
    onClose();
  };

  return (
    <form className="form" onSubmit={submit} noValidate>
      <label className="field">
        <span className="field__label">Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Walk 20 minutes" autoFocus required />
      </label>

      <fieldset className="field">
        <legend className="field__label">Part of life</legend>
        <div className="choice-row">
          {(['health', 'work'] as Area[]).map((a) => (
            <label key={a} className={`choice choice--${a}`}>
              <input type="radio" name="area" checked={area === a} onChange={() => setArea(a)} />
              <span>{AREA_LABEL[a]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">How it's tracked</legend>
        <div className="choice-row">
          <label className="choice">
            <input type="radio" name="measure" checked={!measured} onChange={() => setMeasured(false)} />
            <span>Done or not done</span>
          </label>
          <label className="choice">
            <input type="radio" name="measure" checked={measured} onChange={() => setMeasured(true)} />
            <span>An amount</span>
          </label>
        </div>
        {measured && (
          <div className="inline-fields">
            <label className="field field--small">
              <span className="field__label">Daily goal</span>
              <input type="number" inputMode="numeric" min={2} max={10000} value={target} onChange={(e) => setTarget(e.target.value)} />
            </label>
            <label className="field field--small">
              <span className="field__label">Unit</span>
              <input value={unit} onChange={(e) => setUnit(e.target.value)} maxLength={20} placeholder="glasses" />
            </label>
          </div>
        )}
        {habit && habit.target !== (measured ? Number(target) : 1) && (
          <p className="hint">Changing the goal also re-scores past days.</p>
        )}
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">When</legend>
        <div className="choice-row">
          {([
            ['daily', 'Every day'],
            ['weekdays', 'Chosen days'],
            ['weekly', 'Times a week'],
          ] as const).map(([k, label]) => (
            <label key={k} className="choice">
              <input type="radio" name="schedule" checked={kind === k} onChange={() => setKind(k)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {kind === 'weekdays' && (
          <div className="day-picker" role="group" aria-label="Days of the week">
            {WEEKDAY_SHORT.map((d, i) => (
              <button
                key={d}
                type="button"
                aria-pressed={days.includes(i)}
                onClick={() => setDays((cur) => (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]))}
              >
                {d}
              </button>
            ))}
          </div>
        )}
        {kind === 'weekly' && (
          <label className="field field--small">
            <span className="field__label">Times per week</span>
            <select value={times} onChange={(e) => setTimes(Number(e.target.value))}>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>

      <fieldset className="field">
        <legend className="field__label">Effort</legend>
        <div className="choice-row">
          {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
            <label key={d} className="choice">
              <input type="radio" name="difficulty" checked={difficulty === d} onChange={() => setDifficulty(d)} />
              <span>
                {d[0].toUpperCase() + d.slice(1)} <small>+{XP_BY_DIFFICULTY[d]} XP</small>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p className="form__error" role="alert">
          {error}
        </p>
      )}

      <div className="form__actions">
        <button type="submit" className="btn btn--primary">
          {habit ? 'Save changes' : 'Add habit'}
        </button>
        <button type="button" className="btn" onClick={onClose}>
          Cancel
        </button>
      </div>

      {habit && (
        <div className="form__danger">
          <button type="button" className="btn btn--quiet" onClick={archive}>
            Pause habit
          </button>
          <button type="button" className="btn btn--quiet btn--danger" onClick={remove}>
            Delete habit
          </button>
        </div>
      )}
    </form>
  );
}
