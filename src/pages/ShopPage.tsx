// The Shop tab: the island store, and the real-life rewards you define and redeem.

import { useState, type FormEvent } from 'react';
import { confirmAction } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { formatShort } from '../lib/dates';
import { XP_PER_COIN } from '../lib/engine';
import { newId } from '../lib/storage';
import { useFx } from '../state/fx';
import { useStore } from '../state/store';
import { IslandStore } from '../components/IslandStore';

type ShopView = 'island' | 'rewards';

export function ShopPage({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { progress } = useStore();
  const [view, setView] = useState<ShopView>('island');

  return (
    <div className="shop">
      <header className="page-head">
        <h1>Shop</h1>
        <span className="coin-balance">
          <Icon name="coin" size={16} /> {progress.coins} coins
        </span>
      </header>
      <div className="segmented shop__tabs" role="tablist" aria-label="Shop sections">
        <button type="button" role="tab" aria-selected={view === 'island'} onClick={() => setView('island')}>
          Island store
        </button>
        <button type="button" role="tab" aria-selected={view === 'rewards'} onClick={() => setView('rewards')}>
          Real-life rewards
        </button>
      </div>
      {view === 'island' ? <IslandStore onNavigate={onNavigate} /> : <RealRewards />}
    </div>
  );
}

function RealRewards() {
  const { state, dispatch, progress, today } = useStore();
  const { toast } = useFx();
  const [name, setName] = useState('');
  const [cost, setCost] = useState('40');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    const n = Number(cost);
    if (!trimmed) return setError('Name the reward.');
    if (!Number.isInteger(n) || n < 1 || n > 100_000) return setError('Set a whole-number price from 1 to 100,000 coins.');
    dispatch({ type: 'saveReward', reward: { id: editingId ?? newId(), name: trimmed.slice(0, 80), cost: n } });
    setName('');
    setCost('40');
    setEditingId(null);
    setError(null);
  };

  const redeem = (id: string, rewardName: string, price: number) => {
    if (progress.coins < price) return;
    dispatch({ type: 'redeem', rewardId: id, day: today });
    toast('Reward redeemed', `Enjoy it: ${rewardName}`);
  };

  const history = [...state.redemptions].reverse().slice(0, 12);

  return (
    <div>
      <p className="muted shop__intro">
        Every {XP_PER_COIN} XP earns a coin. Set rewards that feel worth working for, then spend coins on them without guilt.
      </p>

      <ul className="reward-list">
        {state.rewards.map((r) => {
          const short = r.cost - progress.coins;
          return (
            <li key={r.id} className="reward">
              <div className="reward__body">
                <span className="reward__name">{r.name}</span>
                <span className="reward__cost">
                  <Icon name="coin" size={12} /> {r.cost}
                </span>
              </div>
              <div className="reward__actions">
                <button type="button" className="btn btn--primary" disabled={short > 0} onClick={() => redeem(r.id, r.name, r.cost)}>
                  {short > 0 ? `${short} more coins` : 'Redeem'}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Edit ${r.name}`}
                  onClick={() => {
                    setEditingId(r.id);
                    setName(r.name);
                    setCost(String(r.cost));
                  }}
                >
                  <Icon name="pencil" size={14} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={`Delete ${r.name}`}
                  onClick={() => confirmAction(`Delete the reward "${r.name}"?`) && dispatch({ type: 'deleteReward', id: r.id })}
                >
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <form className="reward-form" onSubmit={submit}>
        <h2>{editingId ? 'Edit reward' : 'Add a reward'}</h2>
        <div className="inline-fields">
          <label className="field">
            <span className="field__label">Reward</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} placeholder="Takeaway night" />
          </label>
          <label className="field field--small">
            <span className="field__label">Price in coins</span>
            <input type="number" inputMode="numeric" min={1} max={100000} value={cost} onChange={(e) => setCost(e.target.value)} />
          </label>
        </div>
        {error && (
          <p className="form__error" role="alert">
            {error}
          </p>
        )}
        <div className="form__actions">
          <button type="submit" className="btn btn--primary">
            {editingId ? 'Save reward' : 'Add reward'}
          </button>
          {editingId && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                setEditingId(null);
                setName('');
                setCost('40');
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {history.length > 0 && (
        <section className="history">
          <h2>Recently redeemed</h2>
          <ul>
            {history.map((h) => (
              <li key={h.id}>
                <span>{h.name}</span>
                <span className="muted">
                  {formatShort(h.on)}, {h.cost} coins
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
