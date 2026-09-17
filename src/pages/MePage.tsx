import { useRef, useState, type ChangeEvent } from 'react';
import { confirmAction } from '../components/Dialog';
import { Icon } from '../components/Icon';
import { SyncSettings } from '../components/SyncSettings';
import { ACHIEVEMENTS } from '../lib/achievements';
import { downloadText } from '../lib/csv';
import { formatShort } from '../lib/dates';
import { levelInfo, scheduleLabel } from '../lib/engine';
import { sampleState } from '../lib/sample';
import { LIMITS, parseState } from '../lib/schema';
import { emptyState } from '../lib/storage';
import { AREA_LABEL } from '../lib/types';
import { useFx } from '../state/fx';
import { useStore } from '../state/store';
import { useSync } from '../sync/SyncProvider';

export function MePage() {
  const { state, dispatch, progress, today } = useStore();
  const { toast } = useFx();
  const sync = useSync();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const lvl = levelInfo(progress.totalXp);
  const archived = state.habits.filter((h) => h.archivedOn !== null);

  const exportJson = () => downloadText(`sprout-isle-backup-${today}.json`, JSON.stringify(state, null, 2), 'application/json');

  const importJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    setImportError(null);
    if (!file) return;
    if (file.size > LIMITS.importBytes) return setImportError('That file is too large to be a backup from this app.');
    try {
      const parsed = parseState(JSON.parse(await file.text()));
      if (!parsed) return setImportError("That file isn't a valid backup. Nothing was changed.");
      if (!confirmAction('Replace everything in the app with this backup?')) return;
      dispatch({ type: 'replace', state: parsed });
      toast('Backup restored');
    } catch {
      setImportError("That file couldn't be read as JSON. Nothing was changed.");
    }
  };

  const loadSample = () => {
    if (state.habits.length && !confirmAction('Replace your data with 90 days of sample data? Export a backup first if you want to keep it.')) return;
    dispatch({ type: 'replace', state: sampleState(today) });
    toast('Sample data loaded', 'Have a look around Insights.');
  };

  const erase = () => {
    const where = sync.login ? ' Sync is on, so this also clears the synced copy and your other devices.' : '';
    if (!confirmAction(`Erase all habits, history and rewards? This cannot be undone.${where}`)) return;
    dispatch({ type: 'replace', state: emptyState() });
  };

  return (
    <div className="me">
      <header className="page-head">
        <h1>You</h1>
      </header>

      <div className="kpis">
        <div className="kpi">
          <span className="kpi__label">Level</span>
          <span className="kpi__value">{lvl.level}</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">Total XP</span>
          <span className="kpi__value">{progress.totalXp.toLocaleString()}</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">Best streak</span>
          <span className="kpi__value">{progress.bestStreak} days</span>
        </div>
        <div className="kpi">
          <span className="kpi__label">Perfect days</span>
          <span className="kpi__value">{progress.perfectDays}</span>
        </div>
      </div>

      <section aria-labelledby="ach-title">
        <h2 id="ach-title">Achievements</h2>
        <ul className="achievements">
          {ACHIEVEMENTS.map((a) => {
            const value = Math.min(a.goal, a.measure(progress, state));
            const unlocked = value >= a.goal;
            return (
              <li key={a.id} className={`achievement${unlocked ? ' is-unlocked' : ''}`}>
                <span className="achievement__badge" aria-hidden="true">
                  <Icon name="star" size={18} />
                </span>
                <div>
                  <strong>{a.name}</strong>
                  <span className="muted">{a.description}</span>
                  {!unlocked && a.goal > 1 && (
                    <span className="achievement__progress">
                      {value} of {a.goal}
                    </span>
                  )}
                  <span className="visually-hidden">{unlocked ? 'Unlocked' : 'Locked'}</span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {archived.length > 0 && (
        <section aria-labelledby="paused-title">
          <h2 id="paused-title">Paused habits</h2>
          <ul className="plain-list">
            {archived.map((h) => (
              <li key={h.id}>
                <div>
                  <strong>{h.name}</strong>
                  <span className="muted">
                    {AREA_LABEL[h.area]}, {scheduleLabel(h)}, paused {formatShort(h.archivedOn!)}
                  </span>
                </div>
                <button type="button" className="btn btn--tiny" onClick={() => dispatch({ type: 'restoreHabit', id: h.id })}>
                  Resume
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SyncSettings />

      <section aria-labelledby="settings-title" className="settings">
        <h2 id="settings-title">Island and data</h2>
        {/* Keyed on the saved name so an import or sync refreshes the field. */}
        <form
          key={state.worldName}
          className="inline-fields"
          onSubmit={(e) => {
            e.preventDefault();
            dispatch({ type: 'setWorldName', name: String(new FormData(e.currentTarget).get('worldName') ?? '') });
            toast('Island renamed');
          }}
        >
          <label className="field">
            <span className="field__label">Island name</span>
            <input name="worldName" defaultValue={state.worldName} maxLength={40} />
          </label>
          <button type="submit" className="btn">
            Rename
          </button>
        </form>

        <p className="muted">
          Your data lives in this browser{sync.login ? ' and your sync gist' : ''}. Export a backup now and then so you don't lose it.
        </p>
        <div className="button-row">
          <button type="button" className="btn" onClick={exportJson}>
            Export backup
          </button>
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importJson} />
          <button type="button" className="btn" onClick={loadSample}>
            Load sample data
          </button>
          <button type="button" className="btn btn--danger" onClick={erase}>
            Erase everything
          </button>
        </div>
        {importError && (
          <p className="form__error" role="alert">
            {importError}
          </p>
        )}
      </section>
    </div>
  );
}
