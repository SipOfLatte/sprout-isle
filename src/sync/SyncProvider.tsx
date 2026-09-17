import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { AppState } from '../lib/types';
import { useStore } from '../state/store';
import { decide } from './decide';
import { createGist, findGist, looksLikeToken, readGist, SyncError, whoAmI, writeGist } from './gist';

const META_KEY = 'sprout-isle/sync/v1';
const DEBOUNCE_MS = 5_000;

/** Kept apart from app data so the token never ends up in a backup file. */
interface SyncMeta {
  token: string;
  gistId: string;
  login: string;
  syncedAt: number;
  lastSyncTime: number;
}

export type SyncPhase = 'off' | 'idle' | 'syncing' | 'error' | 'conflict';

interface SyncApi {
  phase: SyncPhase;
  message: string | null;
  login: string | null;
  gistId: string | null;
  lastSyncTime: number | null;
  conflict: { local: AppState; remote: AppState } | null;
  connect: (token: string) => Promise<boolean>;
  disconnect: () => void;
  syncNow: () => Promise<void>;
  resolve: (keep: 'local' | 'remote') => Promise<void>;
}

function loadMeta(): SyncMeta | null {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) ?? 'null') as Partial<SyncMeta> | null;
    if (
      m &&
      typeof m.token === 'string' &&
      looksLikeToken(m.token) &&
      typeof m.gistId === 'string' &&
      /^[A-Za-z0-9]+$/.test(m.gistId) &&
      typeof m.login === 'string' &&
      typeof m.syncedAt === 'number' &&
      typeof m.lastSyncTime === 'number'
    )
      return m as SyncMeta;
  } catch {
    /* fall through */
  }
  return null;
}

function saveMeta(meta: SyncMeta | null) {
  try {
    if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(META_KEY);
  } catch {
    /* storage blocked: sync still works for this session */
  }
}

const SyncContext = createContext<SyncApi | null>(null);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useStore();
  const [meta, setMetaState] = useState<SyncMeta | null>(loadMeta);
  const [phase, setPhase] = useState<SyncPhase>(meta ? 'idle' : 'off');
  const [message, setMessage] = useState<string | null>(null);
  const [conflict, setConflict] = useState<SyncApi['conflict']>(null);

  const stateRef = useRef(state);
  const metaRef = useRef(meta);
  const busy = useRef(false);
  useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  const setMeta = useCallback((m: SyncMeta | null) => {
    metaRef.current = m;
    setMetaState(m);
    saveMeta(m);
  }, []);

  const fail = useCallback((err: unknown) => {
    setPhase('error');
    setMessage(err instanceof SyncError ? err.message : 'Sync failed unexpectedly. Try again.');
  }, []);

  const push = useCallback(
    async (m: SyncMeta, snapshot: AppState) => {
      await writeGist(m.token, m.gistId, snapshot);
      setMeta({ ...m, syncedAt: snapshot.updatedAt, lastSyncTime: Date.now() });
    },
    [setMeta],
  );

  const pull = useCallback(
    (m: SyncMeta, remote: AppState) => {
      dispatch({ type: 'replace', state: remote, fromSync: true });
      setMeta({ ...m, syncedAt: remote.updatedAt, lastSyncTime: Date.now() });
    },
    [dispatch, setMeta],
  );

  const run = useCallback(async () => {
    let m = metaRef.current;
    if (!m || busy.current) return;
    busy.current = true;
    setPhase('syncing');
    try {
      const snapshot = stateRef.current;
      let remote: AppState | null;
      try {
        remote = await readGist(m.token, m.gistId);
      } catch (err) {
        if (!(err instanceof SyncError && err.kind === 'not-found')) throw err;
        // The gist was deleted on GitHub: start a fresh one from this device.
        m = { ...m, gistId: await createGist(m.token, snapshot), syncedAt: snapshot.updatedAt, lastSyncTime: Date.now() };
        setMeta(m);
        setPhase('idle');
        setMessage(null);
        return;
      }

      switch (decide(snapshot.updatedAt, remote?.updatedAt ?? null, m.syncedAt)) {
        case 'push':
          await push(m, snapshot);
          break;
        case 'pull':
          pull(m, remote!);
          break;
        case 'conflict':
          setConflict({ local: snapshot, remote: remote! });
          setPhase('conflict');
          setMessage(null);
          return;
        case 'none':
          setMeta({ ...m, syncedAt: Math.max(m.syncedAt, snapshot.updatedAt), lastSyncTime: Date.now() });
      }
      setPhase('idle');
      setMessage(null);
    } catch (err) {
      fail(err);
    } finally {
      busy.current = false;
    }
  }, [fail, pull, push, setMeta]);

  const connect = useCallback(
    async (rawToken: string) => {
      const token = rawToken.trim();
      if (!looksLikeToken(token)) {
        setPhase('error');
        setMessage('That doesn\'t look like a GitHub token. It should start with "github_pat_" or "ghp_".');
        return false;
      }
      setPhase('syncing');
      setMessage(null);
      try {
        const login = await whoAmI(token);
        const existing = await findGist(token);
        const snapshot = stateRef.current;
        const gistId = existing ?? (await createGist(token, snapshot));
        // A new gist already holds this device's data; an existing one needs a first sync.
        setMeta({ token, gistId, login, syncedAt: existing ? 0 : snapshot.updatedAt, lastSyncTime: existing ? 0 : Date.now() });
        setPhase('idle');
        if (existing) await run();
        return true;
      } catch (err) {
        fail(err);
        return false;
      }
    },
    [fail, run, setMeta],
  );

  const disconnect = useCallback(() => {
    setMeta(null);
    setConflict(null);
    setPhase('off');
    setMessage(null);
  }, [setMeta]);

  const resolve = useCallback(
    async (keep: 'local' | 'remote') => {
      const m = metaRef.current;
      if (!m || !conflict) return;
      setPhase('syncing');
      try {
        if (keep === 'remote') pull(m, conflict.remote);
        else {
          // Re-stamp this device's copy so it wins cleanly everywhere.
          const kept = { ...stateRef.current, updatedAt: Date.now() };
          await push(m, kept);
          dispatch({ type: 'replace', state: kept, fromSync: true });
        }
        setConflict(null);
        setPhase('idle');
        setMessage(null);
      } catch (err) {
        fail(err);
      }
    },
    [conflict, dispatch, fail, pull, push],
  );

  const connected = meta !== null;

  // Sync on open, shortly after edits, and when the app is hidden.
  useEffect(() => {
    if (connected) run();
  }, [connected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = metaRef.current;
    if (!m || phase === 'conflict' || state.updatedAt <= m.syncedAt) return;
    const id = setTimeout(run, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [state.updatedAt, phase, run]);

  useEffect(() => {
    const onHide = () => {
      const m = metaRef.current;
      if (document.visibilityState === 'hidden' && m && stateRef.current.updatedAt > m.syncedAt) run();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [run]);

  const value = useMemo<SyncApi>(
    () => ({
      phase,
      message,
      login: meta?.login ?? null,
      gistId: meta?.gistId ?? null,
      lastSyncTime: meta?.lastSyncTime || null,
      conflict,
      connect,
      disconnect,
      syncNow: run,
      resolve,
    }),
    [phase, message, meta, conflict, connect, disconnect, run, resolve],
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync(): SyncApi {
  const api = useContext(SyncContext);
  if (!api) throw new Error('useSync must be used inside SyncProvider');
  return api;
}
