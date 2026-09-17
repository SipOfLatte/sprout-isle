import { useRef } from 'react';
import type { DateKey } from '../lib/dates';
import { amountOn, habitStreak, isDone, scheduleLabel, weekCompletions } from '../lib/engine';
import { AREA_LABEL, XP_BY_DIFFICULTY, type Habit } from '../lib/types';
import { useFx } from '../state/fx';
import { useStore } from '../state/store';
import { Icon } from './Icon';

export function HabitRow({ habit, day, readOnly = false, onEdit }: { habit: Habit; day: DateKey; readOnly?: boolean; onEdit: (h: Habit) => void }) {
  const { state, dispatch, today } = useStore();
  const { launchSeed } = useFx();
  const checkRef = useRef<HTMLButtonElement>(null);

  const amount = amountOn(state, habit.id, day);
  const done = isDone(habit, amount);
  const streak = habitStreak(state, habit, day === today ? today : day);
  const measured = habit.target > 1;
  const s = habit.schedule;
  const weekCount = s.kind === 'weekly' ? weekCompletions(state, habit, day) : 0;

  const set = (next: number) => {
    const clamped = Math.max(0, Math.min(habit.target * 10, next));
    const willBeDone = clamped >= habit.target;
    dispatch({ type: 'setAmount', habitId: habit.id, day, amount: clamped });
    if (willBeDone && !done && checkRef.current) launchSeed(checkRef.current, habit.area);
  };

  const meta = [scheduleLabel(habit)];
  if (s.kind === 'weekly') meta.push(`${weekCount} of ${s.times} this week`);

  return (
    <li className={`habit habit--${habit.area}${done ? ' is-done' : ''}`}>
      {measured ? (
        <div className="stepper" role="group" aria-label={`${habit.name} amount`}>
          <button type="button" className="stepper__btn" onClick={() => set(amount - 1)} disabled={readOnly || amount === 0} aria-label={`Remove one ${habit.unit || 'unit'}`}>
            <Icon name="minus" size={10} />
          </button>
          <button
            ref={checkRef}
            type="button"
            disabled={readOnly}
            className="stepper__value"
            onClick={() => set(done ? 0 : habit.target)}
            aria-label={done ? `${habit.name}: goal reached, reset to 0` : `${habit.name}: mark goal of ${habit.target} reached`}
          >
            <span className="num">{amount}</span>
            <span className="of">/{habit.target}</span>
          </button>
          <button type="button" className="stepper__btn" disabled={readOnly} onClick={() => set(amount + 1)} aria-label={`Add one ${habit.unit || 'unit'}`}>
            <Icon name="plus" size={10} />
          </button>
        </div>
      ) : (
        <button
          ref={checkRef}
          type="button"
          className="check"
          disabled={readOnly}
          aria-pressed={done}
          aria-label={`${habit.name}${done ? ', done' : ''}`}
          onClick={() => set(done ? 0 : 1)}
        >
          {done && <Icon name="check" size={16} />}
        </button>
      )}

      <div className="habit__body">
        <span className="habit__name">{habit.name}</span>
        <span className="habit__meta">
          <span className="area-tag">
            <Icon name={habit.area === 'health' ? 'leaf' : 'book'} size={11} />
            {AREA_LABEL[habit.area]}
          </span>
          <span>{meta.join(', ')}</span>
          {measured && habit.unit && <span>{habit.unit}</span>}
        </span>
      </div>

      <div className="habit__side">
        {streak > 1 && (
          <span className="streak" title={`${streak} ${s.kind === 'weekly' ? 'weeks' : 'in a row'}`}>
            <Icon name="flame" size={12} />
            {streak}
            <span className="visually-hidden">{s.kind === 'weekly' ? ' week streak' : ' day streak'}</span>
          </span>
        )}
        <span className="xp-chip">+{XP_BY_DIFFICULTY[habit.difficulty]}</span>
        <button type="button" className="icon-btn" onClick={() => onEdit(habit)} aria-label={`Edit ${habit.name}`}>
          <Icon name="pencil" size={14} />
        </button>
      </div>
    </li>
  );
}
