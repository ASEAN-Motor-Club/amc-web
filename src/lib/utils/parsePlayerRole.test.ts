import { describe, it, expect } from 'vitest';
import { parsePlayerRoles } from './parsePlayerRole';

describe('parsePlayerRoles', () => {
  it('returns empty array for names without role tag', () => {
    expect(parsePlayerRoles('SomePlayer')).toEqual([]);
  });

  it('parses single role without level', () => {
    const roles = parsePlayerRoles('[M] Player');
    expect(roles).toEqual([{ letter: 'M', label: 'Modded', level: undefined, color: 'bg-amber-600' }]);
  });

  it('parses role with level', () => {
    const roles = parsePlayerRoles('[P1] Player');
    expect(roles).toEqual([{ letter: 'P', label: 'Police', level: 1, color: 'bg-blue-600' }]);
  });

  it('parses multiple roles with levels', () => {
    const roles = parsePlayerRoles('[P1G1M] Yuuka');
    expect(roles).toEqual([
      { letter: 'P', label: 'Police', level: 1, color: 'bg-blue-600' },
      { letter: 'G', label: 'Gov Worker', level: 1, color: 'bg-green-600' },
      { letter: 'M', label: 'Modded', level: undefined, color: 'bg-amber-600' },
    ]);
  });

  it('parses role with double-digit level', () => {
    const roles = parsePlayerRoles('[C12] Player');
    expect(roles).toEqual([{ letter: 'C', label: 'Criminal', level: 12, color: 'bg-red-600' }]);
  });

  it('ignores unknown letters', () => {
    const roles = parsePlayerRoles('[X1P2] Player');
    expect(roles).toEqual([{ letter: 'P', label: 'Police', level: 2, color: 'bg-blue-600' }]);
  });
});
