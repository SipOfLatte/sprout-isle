import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from './components/Icon';
import { unlockedIds, ACHIEVEMENTS } from './lib/achievements';
import { levelInfo } from './lib/engine';
import { InsightsPage } from './pages/InsightsPage';
import { MePage } from './pages/MePage';
import { ShopPage } from './pages/ShopPage';
import { TodayPage } from './pages/TodayPage';
import { WorldPage } from './pages/WorldPage';
import { useFx } from './state/fx';
import { useStore } from './state/store';

const TABS: { id: string; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Today', icon: 'sun' },
  { id: 'world', label: 'Island', icon: 'isle' },
  { id: 'insights', label: 'Insights', icon: 'chart' },
  { id: 'shop', label: 'Rewards', icon: 'gift' },
  { id: 'me', label: 'You', icon: 'person' },
];

function readHash() {
  const id = window.location.hash.slice(1);
  return TABS.some((t) => t.id === id) ? id : 'today';
}

function useCelebrations() {
  const { state, progress } = useStore();
  const { toast } = useFx();
  const level = levelInfo(progress.totalXp).level;
  const unlocked = unlockedIds(progress, state);
  const prev = useRef({ level, unlocked, sample: state.isSample, habits: state.habits });

  useEffect(() => {
    const before = prev.current;
    prev.current = { level, unlocked, sample: state.isSample, habits: state.habits };
    // A bulk change (import, sample data, erase) shouldn't set off a parade of toasts.
    if (before.sample !== state.isSample || Math.abs(level - before.level) > 1) return;
    if (level > before.level) toast(`Level ${level}!`, 'Your island grows a little brighter.');
    const fresh = ACHIEVEMENTS.filter((a) => unlocked.has(a.id) && !before.unlocked.has(a.id));
    if (fresh.length > 0 && fresh.length <= 2) fresh.forEach((a) => toast('Achievement unlocked', a.name));
  }, [level, unlocked, state.isSample, state.habits, toast]);
}

export default function App() {
  const [tab, setTab] = useState(readHash);
  const { saveFailed } = useStore();
  const mainRef = useRef<HTMLElement>(null);
  useCelebrations();

  useEffect(() => {
    const onHash = () => setTab(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id: string) => {
    window.location.hash = id;
    setTab(id);
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  };

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        Skip to content
      </a>
      <nav className="nav" aria-label="Main">
        <span className="nav__brand">Sprout Isle</span>
        <ul>
          {TABS.map((t) => (
            <li key={t.id}>
              <a
                href={`#${t.id}`}
                aria-current={tab === t.id ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  go(t.id);
                }}
              >
                <Icon name={t.icon} size={18} />
                <span>{t.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <main id="main" ref={mainRef} tabIndex={-1} className="main">
        {saveFailed && (
          <p className="notice notice--warn" role="alert">
            Your browser blocked saving, so changes will be lost when you close this tab. Export a backup from the You tab.
          </p>
        )}
        {tab === 'today' && <TodayPage onNavigate={go} />}
        {tab === 'world' && <WorldPage />}
        {tab === 'insights' && <InsightsPage />}
        {tab === 'shop' && <ShopPage />}
        {tab === 'me' && <MePage />}
      </main>
    </div>
  );
}
