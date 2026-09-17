import { useState } from 'react';
import { BOSSES, CATALOG, type CatalogItem, type ItemKind } from '../lib/catalog';
import { levelInfo } from '../lib/engine';
import { useFx } from '../state/fx';
import { useStore } from '../state/store';
import { ITEM_ART } from '../world/art';
import { Icon } from './Icon';
import { PixelSprite } from './PixelSprite';

const FILTERS: { id: ItemKind | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'building', label: 'Buildings' },
  { id: 'decor', label: 'Decor' },
  { id: 'sky', label: 'Sky' },
  { id: 'pet', label: 'Pets' },
];

const bossFor = (item: CatalogItem) => Object.values(BOSSES).find((b) => b.loot === item.id);

export function IslandStore({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { state, dispatch, progress, today, owned } = useStore();
  const { toast } = useFx();
  const [filter, setFilter] = useState<ItemKind | 'all'>('all');
  const level = levelInfo(progress.totalXp).level;

  const items = CATALOG.filter((i) => filter === 'all' || i.kind === filter).sort((a, b) => {
    // Buyable first, cheapest first; boss loot last.
    if ((a.price === null) !== (b.price === null)) return a.price === null ? 1 : -1;
    return (a.price ?? 0) - (b.price ?? 0);
  });

  const buy = (item: CatalogItem) => {
    if (item.price === null || progress.coins < item.price || owned.has(item.id)) return;
    dispatch({ type: 'buy', itemId: item.id, day: today });
    toast(
      `${item.name} bought`,
      item.kind === 'pet' ? 'It has already moved onto your island.' : 'Place it from the Island tab.',
    );
  };

  const placedCount = Object.keys(state.placements).length;

  return (
    <div className="store">
      <p className="muted shop__intro">
        Spend coins on things to put on your island. Beat weekly bosses for rare items you can't buy.
        {placedCount === 0 && owned.size > 0 && (
          <>
            {' '}
            <button type="button" className="link" onClick={() => onNavigate('world')}>
              Decorate your island
            </button>
          </>
        )}
      </p>

      <div className="chips" role="group" aria-label="Filter items">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <ul className="store-grid">
        {items.map((item) => {
          const has = owned.has(item.id);
          const locked = item.price !== null && level < item.level;
          const short = item.price !== null ? item.price - progress.coins : 0;
          const boss = bossFor(item);
          return (
            <li key={item.id} className={`store-item${has ? ' is-owned' : ''}${locked ? ' is-locked' : ''}`}>
              <div className={`store-item__art store-item__art--${item.kind}`}>
                <PixelSprite sprite={ITEM_ART[item.id]} scale={5} />
              </div>
              <div className="store-item__body">
                <strong>{item.name}</strong>
                <span className="muted">{item.price === null && boss && !has ? `Beat ${boss.name} to win it.` : item.description}</span>
              </div>
              <div className="store-item__foot">
                {item.price === null ? (
                  <span className="store-item__note">{has ? 'Won' : 'Boss loot'}</span>
                ) : (
                  <span className="reward__cost">
                    <Icon name="coin" size={12} /> {item.price}
                  </span>
                )}
                {has ? (
                  <span className="store-item__note">Owned</span>
                ) : locked ? (
                  <span className="store-item__note">Level {item.level}</span>
                ) : item.price !== null ? (
                  <button type="button" className="btn btn--tiny btn--primary" disabled={short > 0} onClick={() => buy(item)}>
                    {short > 0 ? `${short} more` : 'Buy'}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
