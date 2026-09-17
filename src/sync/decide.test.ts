import { describe, expect, it } from 'vitest';
import { decide } from './decide';
import { looksLikeToken } from './gist';

describe('decide', () => {
  it('pushes when the gist is empty', () => {
    expect(decide(5, null, 0)).toBe('push');
  });

  it('pulls onto a fresh device', () => {
    expect(decide(0, 100, 0)).toBe('pull');
  });

  it('pushes local-only edits and pulls remote-only edits', () => {
    expect(decide(200, 100, 100)).toBe('push');
    expect(decide(100, 200, 100)).toBe('pull');
  });

  it('flags edits on both sides as a conflict', () => {
    expect(decide(300, 200, 100)).toBe('conflict');
  });

  it('does nothing when already in step', () => {
    expect(decide(100, 100, 100)).toBe('none');
    expect(decide(100, 100, 0)).toBe('none');
  });
});

describe('looksLikeToken', () => {
  it('accepts fine-grained and classic token shapes only', () => {
    expect(looksLikeToken('github_pat_' + 'a'.repeat(40))).toBe(true);
    expect(looksLikeToken('ghp_' + 'A1'.repeat(18))).toBe(true);
    expect(looksLikeToken('password123')).toBe(false);
    expect(looksLikeToken('ghp_short')).toBe(false);
  });
});
