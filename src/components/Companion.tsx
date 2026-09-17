import { useState, type FormEvent } from 'react';
import { SPECIES } from '../lib/catalog';
import { bond, petLine, petMood, STAGE_AT, STAGE_NAMES, stageFor } from '../lib/pets';
import type { Species } from '../lib/types';
import { useStore } from '../state/store';
import { PET_ART } from '../world/art';
import { PixelSprite } from './PixelSprite';

const DEFAULT_NAMES: Record<Species, string> = { sprout: 'Sprig', fox: 'Maple', frog: 'Lily' };

/** The companion's greeting on Today, or the hatching choice if there isn't one yet. */
export function CompanionCorner() {
  const { state, today } = useStore();
  const companion = state.companion;
  if (!companion) return <HatchCard />;

  const points = bond(state, companion, today);
  const { stage, next } = stageFor(points);
  const mood = petMood(state, today);
  const line = petLine(mood, companion.name, today);
  const prev = STAGE_AT[stage];

  return (
    <section className={`companion companion--${mood}`} aria-label={`${companion.name} says`}>
      <div className="companion__pet">
        <PixelSprite sprite={PET_ART[companion.species][stage]} scale={5} label={`${companion.name}, ${STAGE_NAMES[stage].toLowerCase()} ${SPECIES[companion.species].name.toLowerCase()}`} />
      </div>
      <div className="companion__body">
        <p className="companion__line">{line}</p>
        <p className="companion__meta">
          <strong>{companion.name}</strong>, {next === null ? 'fully grown' : STAGE_NAMES[stage].toLowerCase()} {SPECIES[companion.species].name.toLowerCase()}
          {next !== null && `. Grows up in ${next - points} more ${next - points === 1 ? 'habit' : 'habits'}.`}
        </p>
        {next !== null && (
          <div
            className="companion__bond"
            role="progressbar"
            aria-label={`${companion.name}'s growth`}
            aria-valuemin={prev}
            aria-valuemax={next}
            aria-valuenow={points}
          >
            <span style={{ width: `${Math.round(((points - prev) / (next - prev)) * 100)}%` }} />
          </div>
        )}
      </div>
    </section>
  );
}

function HatchCard() {
  const { dispatch, today } = useStore();
  const [species, setSpecies] = useState<Species>('sprout');
  const [name, setName] = useState('');

  const hatch = (e: FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'adopt', species, name: name || DEFAULT_NAMES[species], day: today });
  };

  return (
    <section className="companion companion--hatch" aria-labelledby="hatch-title">
      <form className="hatch" onSubmit={hatch}>
        <h2 id="hatch-title">An egg appeared on your island</h2>
        <p className="muted">Choose who hatches. Your companion grows as you finish habits and keeps you company on rough days.</p>
        <div className="hatch__choices" role="radiogroup" aria-label="Companion">
          {(Object.keys(SPECIES) as Species[]).map((s) => (
            <label key={s} className={`hatch__choice${species === s ? ' is-selected' : ''}`}>
              <input type="radio" name="species" checked={species === s} onChange={() => setSpecies(s)} />
              <PixelSprite sprite={PET_ART[s][0]} scale={5} />
              <strong>{SPECIES[s].name}</strong>
              <span className="muted">{SPECIES[s].blurb}</span>
            </label>
          ))}
        </div>
        <div className="inline-fields">
          <label className="field">
            <span className="field__label">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={20} placeholder={DEFAULT_NAMES[species]} />
          </label>
          <button type="submit" className="btn btn--primary">
            Hatch the egg
          </button>
        </div>
      </form>
    </section>
  );
}
