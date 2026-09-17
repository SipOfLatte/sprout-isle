import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyState } from '../lib/storage';
import { GIST_FILE, readGist, SyncError, writeGist } from './gist';

const TOKEN = 'github_pat_' + 'a'.repeat(40);

function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
  const fn = vi.fn((url: string | URL, init?: RequestInit) => Promise.resolve(handler(String(url), init)));
  vi.stubGlobal('fetch', fn);
  return fn;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const gistWith = (file: object) => json({ id: 'abc', html_url: '', files: { [GIST_FILE]: { filename: GIST_FILE, ...file } } });

afterEach(() => vi.unstubAllGlobals());

describe('gist client', () => {
  it('sends the token only to the GitHub API', async () => {
    const fetch = mockFetch(() => json({}));
    await writeGist(TOKEN, 'abc', emptyState());
    const [url, init] = fetch.mock.calls[0];
    expect(String(url)).toBe('https://api.github.com/gists/abc');
    expect((init?.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('round-trips valid data', async () => {
    const state = { ...emptyState(), worldName: 'Synced', updatedAt: 42 };
    mockFetch(() => gistWith({ content: JSON.stringify({ app: 'sprout-isle', state }) }));
    expect(await readGist(TOKEN, 'abc')).toMatchObject({ worldName: 'Synced', updatedAt: 42 });
  });

  it('rejects data that fails the schema', async () => {
    mockFetch(() => gistWith({ content: JSON.stringify({ app: 'sprout-isle', state: { habits: 'nope' } }) }));
    await expect(readGist(TOKEN, 'abc')).rejects.toMatchObject({ kind: 'invalid' });
  });

  it('refuses to follow a truncated file to a non-GitHub host', async () => {
    mockFetch(() => gistWith({ truncated: true, raw_url: 'https://evil.example/steal' }));
    await expect(readGist(TOKEN, 'abc')).rejects.toBeInstanceOf(SyncError);
  });

  it('maps HTTP errors to clear messages', async () => {
    mockFetch(() => json({}, 401));
    await expect(readGist(TOKEN, 'abc')).rejects.toMatchObject({ kind: 'auth' });
    mockFetch(() => json({}, 404));
    await expect(readGist(TOKEN, 'abc')).rejects.toMatchObject({ kind: 'not-found' });
  });
});
