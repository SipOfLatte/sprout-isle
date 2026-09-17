import { useEffect, useRef, useState } from 'react';
import { BOSS_XP, bossOutcomes, DAMAGE, evaluateBoss, REPEAT_BOSS_XP } from '../lib/bosses';
import { BOSSES, ITEMS_BY_ID } from '../lib/catalog';
import { addDays, diffDays, startOfWeek } from '../lib/dates';
import { prefersReducedMotion } from '../state/fx';
import { useStore } from '../state/store';
import { BOSS_ART, ITEM_ART } from '../world/art';
import { PixelSprite } from './PixelSprite';

const SEGMENTS = 20;

export function BossCard() {
  const { state, today } = useStore();
  const weekStart = startOfWeek(today);
  const boss = state.bosses[weekStart];
  const status = boss ? evaluateBoss(state, weekStart, boss, today) : null;

  // A short shake and damage number when a habit lands a hit.
  const lastDamage = useRef<number | null>(null);
  const hitCount = useRef(0);
  const [hit, setHit] = useState<{ amount: number; id: number } | null>(null);
  useEffect(() => {
    if (!status) return;
    const before = lastDamage.current;
    lastDamage.current = status.damage;
    if (before === null || status.damage <= before || prefersReducedMotion()) return;
    const id = ++hitCount.current;
    setHit({ amount: status.damage - before, id });
    const t = setTimeout(() => setHit((h) => (h?.id === id ? null : h)), 900);
    return () => clearTimeout(t);
  }, [status?.damage]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!boss || !status) return null;

  const info = BOSSES[boss.kind];
  const remaining = Math.max(0, boss.hp - status.damage);
  const filled = Math.ceil((remaining / boss.hp) * SEGMENTS);
  const defeated = status.defeatedOn !== null;
  const daysLeft = diffDays(today, addDays(weekStart, 6));
  const loot = ITEMS_BY_ID.get(info.loot)!;
  // Loot drops on the first win against each kind; later wins pay extra XP instead.
  const lootFrom = bossOutcomes(state, today).lootWeek[loot.id];
  const alreadyHasLoot = lootFrom !== undefined && lootFrom !== weekStart;

  return (
    <section className={`boss${defeated ? ' is-defeated' : ''}`} aria-labelledby="boss-title">
      <header className="boss__head">
        <h2 id="boss-title">Weekly boss</h2>
        <span className="quests__meta">{defeated ? 'Defeated' : daysLeft === 0 ? 'Last day' : `${daysLeft + 1} days left`}</span>
      </header>

      <div className="boss__arena">
        <div className={`boss__sprite${hit ? ' is-hit' : ''}`} key={hit?.id}>
          <PixelSprite sprite={BOSS_ART[boss.kind]} scale={6} label={info.name} />
          {hit && (
            <span className="boss__damage" aria-hidden="true">
              −{hit.amount}
            </span>
          )}
        </div>
        <div className="boss__info">
          <strong className="boss__name">{info.name}</strong>
          <p className="boss__quote">{defeated ? info.defeat : `“${info.taunt}”`}</p>
        </div>
      </div>

      <div
        className="boss__hp"
        role="progressbar"
        aria-label={`${info.name} health`}
        aria-valuemin={0}
        aria-valuemax={boss.hp}
        aria-valuenow={remaining}
      >
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span key={i} className={i < filled ? 'on' : ''} />
        ))}
      </div>
      <p className="boss__numbers">
        <span>
          {remaining} / {boss.hp} HP
        </span>
        <span>{status.damage} damage dealt</span>
      </p>

      <div className="boss__reward">
        <span className="boss__loot">
          <PixelSprite sprite={ITEM_ART[loot.id]} scale={3} />
        </span>
        <p>
          {defeated ? 'Won: ' : 'Win: '}
          {alreadyHasLoot ? `+${BOSS_XP + REPEAT_BOSS_XP} XP` : `+${BOSS_XP} XP and a ${loot.name.toLowerCase()} for your island`}
        </p>
      </div>
      {!defeated && (
        <p className="quests__foot">
          Every habit you finish hits it: easy for {DAMAGE.easy}, medium for {DAMAGE.medium}, hard for {DAMAGE.hard}. To-dos and perfect days hit too.
        </p>
      )}
    </section>
  );
}
