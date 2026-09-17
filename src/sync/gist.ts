// Minimal GitHub Gist client. The token is only ever sent to api.github.com
// in an Authorization header, and nothing read back is trusted until it
// passes the same schema as a local backup.

import { parseState } from '../lib/schema';
import type { AppState } from '../lib/types';

const API = 'https://api.github.com';
const RAW_HOST = 'gist.githubusercontent.com';
export const GIST_FILE = 'sprout-isle.json';
const GIST_DESCRIPTION = 'Sprout Isle sync data';
const MAX_BYTES = 5_000_000;

export class SyncError extends Error {
  readonly kind: 'auth' | 'permission' | 'not-found' | 'network' | 'invalid' | 'rate-limit' | 'unknown';
  constructor(kind: SyncError['kind'], message: string) {
    super(message);
    this.kind = kind;
  }
}

/** Fine-grained (github_pat_) and classic (ghp_) personal access tokens. */
export function looksLikeToken(token: string): boolean {
  return /^(github_pat_[A-Za-z0-9_]{20,255}|ghp_[A-Za-z0-9]{30,255})$/.test(token);
}

async function request(token: string, path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
  } catch {
    throw new SyncError('network', "Couldn't reach GitHub. Check your connection and try again.");
  }
  if (res.ok) return res;
  if (res.status === 401) throw new SyncError('auth', 'GitHub rejected the token. It may have expired or been revoked.');
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0')
    throw new SyncError('rate-limit', 'GitHub rate limit reached. Sync will work again within the hour.');
  if (res.status === 403) throw new SyncError('permission', 'The token needs the "Gists: Read and write" permission.');
  if (res.status === 404) throw new SyncError('not-found', "The sync gist wasn't found. It may have been deleted.");
  throw new SyncError('unknown', `GitHub returned an error (${res.status}). Try again later.`);
}

interface GistFile {
  filename: string;
  content?: string;
  truncated?: boolean;
  raw_url?: string;
  size?: number;
}

interface Gist {
  id: string;
  html_url: string;
  files: Record<string, GistFile>;
}

export async function whoAmI(token: string): Promise<string> {
  const res = await request(token, '/user');
  const body = (await res.json()) as { login?: unknown };
  return typeof body.login === 'string' ? body.login : 'unknown';
}

export async function findGist(token: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const res = await request(token, `/gists?per_page=100&page=${page}`);
    const gists = (await res.json()) as Gist[];
    const match = gists.find((g) => g.files && GIST_FILE in g.files);
    if (match) return match.id;
    if (gists.length < 100) return null;
  }
  return null;
}

function serialize(state: AppState): string {
  return JSON.stringify({ app: 'sprout-isle', state });
}

export async function createGist(token: string, state: AppState): Promise<string> {
  const res = await request(token, '/gists', {
    method: 'POST',
    body: JSON.stringify({ description: GIST_DESCRIPTION, public: false, files: { [GIST_FILE]: { content: serialize(state) } } }),
  });
  return ((await res.json()) as Gist).id;
}

export async function writeGist(token: string, id: string, state: AppState): Promise<void> {
  await request(token, `/gists/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ files: { [GIST_FILE]: { content: serialize(state) } } }),
  });
}

export async function readGist(token: string, id: string): Promise<AppState | null> {
  const res = await request(token, `/gists/${encodeURIComponent(id)}`);
  const gist = (await res.json()) as Gist;
  const file = gist.files?.[GIST_FILE];
  if (!file) return null;
  if ((file.size ?? 0) > MAX_BYTES) throw new SyncError('invalid', 'The synced file is too large.');

  let content = file.content ?? '';
  if (file.truncated && file.raw_url) {
    // Large files come back truncated; fetch the raw copy, but only from GitHub.
    const url = new URL(file.raw_url);
    if (url.protocol !== 'https:' || url.hostname !== RAW_HOST) throw new SyncError('invalid', 'Unexpected gist location.');
    try {
      content = await (await fetch(url, { cache: 'no-store' })).text();
    } catch {
      throw new SyncError('network', "Couldn't download the synced file.");
    }
  }

  try {
    const parsed = JSON.parse(content) as { app?: unknown; state?: unknown };
    const state = parsed.app === 'sprout-isle' ? parseState(parsed.state) : null;
    if (!state) throw new Error();
    return state;
  } catch {
    throw new SyncError('invalid', "The synced file isn't valid Sprout Isle data, so nothing was changed.");
  }
}
