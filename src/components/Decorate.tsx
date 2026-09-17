// Placing owned items into island spots, plus renaming the companion. Placement goes through the
// reducer, which checks the item fits the spot.

import type { FormEvent } from 'react';
import { ITEMS_BY_ID, SLOTS, slotAccepts, SPECIES } from '../lib/catalog';
import { formatShort } from '../lib/dates';
import { bond, STAGE_NAMES, stageFor } from '../lib/pets';
import { useStore } from '../state/store';
import { ITEM_ART, PET_ART } from '../world/art';
import { PixelSprite } from './PixelSprite';

/** Numbered markers over the full island view (viewBox 12 18 136 68). */
/** Positions are percentages of the island frame, so the markers line up at any screen size. */
export function SlotMarkers() {
  const { state } = useStore();
  return (
    <div className="slot-markers" aria-hidden="true">
      {SLOTS.map((slot, i) => (
        <span
          key={slot.id}
          className={`slot-marker${state.placements[slot.id] ? ' is-taken' : ''}`}
          style={{ left: `${((slot.x + 6 - 12) / 136) * 100}%`, top: `${((slot.bottom - 3 - 18) / 68) * 100}%` }}
        >
          {i + 1}
        </span>
      ))}
    </div>
  );
}

export function Decorate({ showSpots, onToggleSpots }: { showSpots: boolean; onToggleSpots: () => void }) {
  const { state, dispatch, owned, today } = useStore();
  const placeable = [...owned].map((id) => ITEMS_BY_ID.get(id)!).filter((i) => i && i.kind !== 'pet');
  const pets = [...owned].map((id) => ITEMS_BY_ID.get(id)!).filter((i) => i?.kind === 'pet');
  const slotOf = (itemId: string) => Object.entries(state.placements).find(([, id]) => id === itemId)?.[0] ?? '';

  return (
    <section className="decorate" aria-labelledby="decorate-title">
      <header className="decorate__head">
        <h2 id="decorate-title">Decorate</h2>
        {placeable.length > 0 && (
          <button type="button" className="btn btn--tiny" aria-pressed={showSpots} onClick={onToggleSpots}>
            {showSpots ? 'Hide spot numbers' : 'Show spot numbers'}
          </button>
        )}
      </header>

      {state.companion && <CompanionSettings />}

      {placeable.length === 0 ? (
        <p className="muted">Buildings, decorations and sky items you buy in the Shop, or win from bosses, show up here to place.</p>
      ) : (
        <ul className="deco-list">
          {placeable.map((item) => {
            const current = slotOf(item.id);
            return (
              <li key={item.id} className="deco-row">
                <span className="deco-row__art">
                  <PixelSprite sprite={ITEM_ART[item.id]} scale={3} />
                </span>
                <label className="deco-row__field">
                  <strong>{item.name}</strong>
                  <select
                    value={current}
                    onChange={(e) =>
                      e.target.value ? dispatch({ type: 'place', slotId: e.target.value, itemId: item.id }) : current && dispatch({ type: 'unplace', slotId: current })
                    }
                  >
                    <option value="">In storage</option>
                    {SLOTS.filter((s) => slotAccepts(s, item.kind)).map((s) => {
                      const occupant = state.placements[s.id];
                      const other = occupant && occupant !== item.id ? ITEMS_BY_ID.get(occupant)?.name : null;
                      return (
                        <option key={s.id} value={s.id}>
                          {`Spot ${SLOTS.indexOf(s) + 1}, ${s.label}${other ? ` (replaces ${other})` : ''}`}
                        </option>
                      );
                    })}
                  </select>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {pets.length > 0 && (
        <p className="muted">
          Also living on your island: {pets.map((p) => p.name.toLowerCase()).join(', ')}.
        </p>
      )}
      {state.companion && (
        <p className="muted">
          {state.companion.name} has been with you since {formatShort(state.companion.adoptedOn)} and helped with {bond(state, state.companion, today)} habits.
        </p>
      )}
    </section>
  );
}

function CompanionSettings() {
  const { state, dispatch, today } = useStore();
  const companion = state.companion!;
  const { stage } = stageFor(bond(state, companion, today));

  const rename = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch({ type: 'renamePet', name: String(new FormData(e.currentTarget).get('petName') ?? '') });
  };

  return (
    <form className="companion-settings" onSubmit={rename} key={companion.name}>
      <PixelSprite sprite={PET_ART[companion.species][stage]} scale={4} />
      <label className="field">
        <span className="field__label">
          Your {STAGE_NAMES[stage].toLowerCase()} {SPECIES[companion.species].name.toLowerCase()}
        </span>
        <input name="petName" defaultValue={companion.name} maxLength={20} />
      </label>
      <button type="submit" className="btn">
        Rename
      </button>
    </form>
  );
}
