import { filterSubsets } from './filterSubsets';
import { describe, it, expect } from 'vitest';

describe('filterSubsets', () => {
  it('removes subsets when a superset exists', () => {
    const input = [
      ['a', 'b', 'c'],
      ['a', 'b'],
      ['b', 'c'],
    ];
    expect(filterSubsets(input)).toEqual([['a', 'b', 'c']]);
  });

  it('keeps groups that are not subsets of each other', () => {
    const input = [
      ['a', 'b'],
      ['c', 'd'],
    ];
    expect(filterSubsets(input)).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
  });

  it('keeps all groups when no subset relation exists', () => {
    const input = [
      ['a', 'b', 'c'],
      ['d', 'e'],
    ];
    expect(filterSubsets(input)).toEqual([
      ['a', 'b', 'c'],
      ['d', 'e'],
    ]);
  });

  it('handles a single group', () => {
    expect(filterSubsets([['a', 'b']])).toEqual([['a', 'b']]);
  });

  it('handles empty input', () => {
    expect(filterSubsets([])).toEqual([]);
  });

  it('removes multiple subsets of the same superset', () => {
    const input = [
      ['a', 'b', 'c', 'd'],
      ['a', 'b'],
      ['c', 'd'],
      ['a', 'c'],
    ];
    expect(filterSubsets(input)).toEqual([['a', 'b', 'c', 'd']]);
  });

  it('keeps a group that partially overlaps but is not a subset', () => {
    // [a,b,c] and [b,c,d]: neither is a subset of the other
    const input = [
      ['a', 'b', 'c'],
      ['b', 'c', 'd'],
    ];
    expect(filterSubsets(input)).toEqual([
      ['a', 'b', 'c'],
      ['b', 'c', 'd'],
    ]);
  });

  it('handles identical groups without removing both', () => {
    // Same reference check uses ===, but identical content in different arrays
    const g1 = ['a', 'b'];
    const g2 = ['a', 'b'];
    // g2 has same length as g1, so neither is a proper superset → both kept
    expect(filterSubsets([g1, g2])).toEqual([
      ['a', 'b'],
      ['a', 'b'],
    ]);
  });
});
