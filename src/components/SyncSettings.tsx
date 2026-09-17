import { useState, type FormEvent } from 'react';
import type { AppState } from '../lib/types';
import { useSync } from '../sync/SyncProvider';
import { confirmAction } from './Dialog';

const TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

function describe(s: AppState) {
  const logged = Object.keys(s.logs).length;
  const when = s.updatedAt ? new Date(s.updatedAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'never';
  return `${s.habits.length} habits, ${logged} days logged, last changed ${when}`;
}

export function SyncSettings() {
  const sync = useSync();
  const [token, setToken] = useState('');

  const connect = async (e: FormEvent) => {
    e.preventDefault();
    if (await sync.connect(token)) setToken('');
  };

  const status =
    sync.phase === 'syncing'
      ? 'Syncing…'
      : sync.lastSyncTime
        ? `Last synced ${new Date(sync.lastSyncTime).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
        : 'Not synced yet';

  return (
    <section aria-labelledby="sync-title" className="settings sync">
      <h2 id="sync-title">Sync across devices</h2>

      {!sync.login ? (
        <>
          <p className="muted">
            Keep your phone and laptop in step by saving your data to a secret GitHub Gist. It's optional and uses your own GitHub account.
          </p>
          <ol className="steps">
            <li>
              <a href={TOKEN_URL} target="_blank" rel="noopener noreferrer">
                Create a fine-grained token on GitHub
              </a>
              . Give it a name and an expiry date.
            </li>
            <li>
              Under <strong>Account permissions</strong>, set <strong>Gists</strong> to <strong>Read and write</strong>. Leave everything else as No access.
            </li>
            <li>Generate the token, copy it, and paste it below. Do the same on each device.</li>
          </ol>
          <form className="inline-fields" onSubmit={connect}>
            <label className="field">
              <span className="field__label">GitHub token</span>
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="github_pat_…"
              />
            </label>
            <button type="submit" className="btn btn--primary" disabled={!token.trim() || sync.phase === 'syncing'}>
              {sync.phase === 'syncing' ? 'Connecting…' : 'Connect'}
            </button>
          </form>
          <details className="fine-print">
            <summary>What to know before connecting</summary>
            <ul>
              <li>The token is saved in this browser only. It never goes into backups and is only sent to GitHub.</li>
              <li>Anyone who can use this browser profile could use the token, so only connect on devices you trust.</li>
              <li>A secret gist is unlisted, not encrypted. People can't find it, but anyone given its link can read it.</li>
              <li>The token can only touch your gists. You can revoke it on GitHub at any time.</li>
            </ul>
          </details>
        </>
      ) : (
        <>
          <p>
            Connected as <strong>@{sync.login}</strong>. <span className="muted">{status}</span>
          </p>

          {sync.phase === 'conflict' && sync.conflict && (
            <div className="conflict" role="alert">
              <strong>This device and your synced copy both changed.</strong>
              <p>Choose which one to keep. The other is replaced everywhere.</p>
              <div className="conflict__options">
                <div>
                  <span className="field__label">This device</span>
                  <span className="muted">{describe(sync.conflict.local)}</span>
                  <button type="button" className="btn" onClick={() => sync.resolve('local')}>
                    Keep this device
                  </button>
                </div>
                <div>
                  <span className="field__label">Synced copy</span>
                  <span className="muted">{describe(sync.conflict.remote)}</span>
                  <button type="button" className="btn" onClick={() => sync.resolve('remote')}>
                    Use synced copy
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="button-row">
            <button type="button" className="btn" onClick={() => sync.syncNow()} disabled={sync.phase === 'syncing' || sync.phase === 'conflict'}>
              Sync now
            </button>
            {sync.gistId && (
              <a className="btn" href={`https://gist.github.com/${sync.gistId}`} target="_blank" rel="noopener noreferrer">
                View gist
              </a>
            )}
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() =>
                confirmAction('Stop syncing on this device? Your data stays here and the gist stays on GitHub. Remember to revoke the token on GitHub if you no longer need it.') &&
                sync.disconnect()
              }
            >
              Disconnect
            </button>
          </div>
        </>
      )}

      {sync.message && (
        <p className="form__error" role="alert">
          {sync.message}
        </p>
      )}
    </section>
  );
}
