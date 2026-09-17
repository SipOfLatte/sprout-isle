import { describe, expect, it } from 'vitest';
import { reorderSubset } from './order';

const items = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ id }));
const ids = (list: { id: string }[]) => list.map((i) => i.id).join('');

describe('reorderSubset', () => {
  it('reorders the whole list', () => {
    expect(ids(reorderSubset(items, ['c', 'a', 'b', 'd', 'e']))).toBe('cabde');
  });

  it('keeps hidden items where they were', () => {
    // Only b, c and e were visible; the user dragged e to the top of that slice.
    expect(ids(reorderSubset(items, ['e', 'b', 'c']))).toBe('aebdc');
  });

  it('ignores an order that mentions unknown ids', () => {
    expect(reorderSubset(items, ['a', 'zzz'])).toBe(items);
  });
});
