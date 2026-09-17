import type { DateKey } from '../lib/dates';
import { CHECKIN_BONUS } from '../lib/engine';
import { ENERGY_LABELS, MOOD_LABELS } from '../lib/wellbeing';
import { useStore } from '../state/store';

// 9×9 pixel faces from rough (1) to great (5); rows 5 and 6 are the mouth.
const FACE_TOP = ['..xxxxx..', '.x.....x.', 'x.......x', 'x..x.x..x', 'x.......x'];
const FACE_BOTTOM = ['.x.....x.', '..xxxxx..'];
const MOUTHS = [
  ['x..xxx..x', 'x.x...x.x'], // frown
  ['x.......x', 'x.xxxx..x'], // wobbly
  ['x.......x', 'x..xxx..x'], // flat
  ['x.x...x.x', 'x..xxx..x'], // smile
  ['x.xxxxx.x', 'x..xxx..x'], // grin
];

function Face({ level }: { level: number }) {
  const rows = [...FACE_TOP, ...MOUTHS[level - 1], ...FACE_BOTTOM];
  return (
    <svg width={27} height={27} viewBox="0 0 9 9" shapeRendering="crispEdges" aria-hidden="true">
      {rows.flatMap((row, y) =>
        [...row].map((ch, x) => (ch === 'x' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)),
      )}
    </svg>
  );
}

function Bars({ level }: { level: number }) {
  return (
    <span className="energy-bars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= level ? 'on' : ''} style={{ height: `${6 + i * 3}px` }} />
      ))}
    </span>
  );
}

export function CheckInCard({ day, readOnly }: { day: DateKey; readOnly: boolean }) {
  const { state, dispatch, today } = useStore();
  const current = state.checkins[day];
  const isToday = day === today;

  if (readOnly && !current) return null;

  const set = (measure: 'mood' | 'energy', value: number) =>
    dispatch({ type: 'checkIn', day, [measure]: current?.[measure] === value ? null : value });

  const row = (measure: 'mood' | 'energy') => {
    const labels = measure === 'mood' ? MOOD_LABELS : ENERGY_LABELS;
    const value = current?.[measure] ?? null;
    return (
      <div className="checkin__row" role="radiogroup" aria-label={measure === 'mood' ? 'Mood' : 'Energy'}>
        <span className="checkin__label">{measure === 'mood' ? 'Mood' : 'Energy'}</span>
        <div className="checkin__options">
          {labels.map((label, i) => {
            const level = i + 1;
            const selected = value === level;
            return (
              <button
                key={label}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={`${label}, ${level} of 5`}
                className={`checkin__option checkin__option--${measure}${selected ? ' is-selected' : ''}`}
                disabled={readOnly}
                onClick={() => set(measure, level)}
              >
                {measure === 'mood' ? <Face level={level} /> : <Bars level={level} />}
                <span className="checkin__text">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <section className="checkin" aria-labelledby={`checkin-${day}`}>
      <header className="checkin__head">
        <h2 id={`checkin-${day}`}>{isToday ? 'How are you today?' : 'How that day felt'}</h2>
        {!readOnly && !current && <span className="checkin__hint">+{CHECKIN_BONUS} XP, and it counts as showing up</span>}
      </header>
      {row('mood')}
      {row('energy')}
    </section>
  );
}
