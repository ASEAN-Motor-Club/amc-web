import { describe, it, expect } from 'vitest';
import { parsePlayerRoles, stripPlayerRoleTag } from './parsePlayerRole';

describe('parsePlayerRoles', () => {
  it('returns empty array for names without role tag', () => {
    expect(parsePlayerRoles('SomePlayer')).toEqual([]);
  });

  it('parses single role without level', () => {
    const roles = parsePlayerRoles('[M] Player');
    expect(roles).toEqual([{ letter: 'M', level: undefined, color: 'bg-amber-600' }]);
  });

  it('parses role with level', () => {
    const roles = parsePlayerRoles('[P1] Player');
    expect(roles).toEqual([{ letter: 'P', level: 1, color: 'bg-blue-600' }]);
  });

  it('parses multiple roles with levels', () => {
    const roles = parsePlayerRoles('[P1G1M] Yuuka');
    expect(roles).toEqual([
      { letter: 'P', level: 1, color: 'bg-blue-600' },
      { letter: 'G', level: 1, color: 'bg-green-600' },
      { letter: 'M', level: undefined, color: 'bg-amber-600' },
    ]);
  });

  it('parses role with double-digit level', () => {
    const roles = parsePlayerRoles('[C12] Player');
    expect(roles).toEqual([{ letter: 'C', level: 12, color: 'bg-red-600' }]);
  });

  it('ignores unknown letters', () => {
    const roles = parsePlayerRoles('[X1P2] Player');
    expect(roles).toEqual([{ letter: 'P', level: 2, color: 'bg-blue-600' }]);
  });
});

describe('stripPlayerRoleTag', () => {
  it('strips tag from name', () => {
    expect(stripPlayerRoleTag('[P1G1M] Yuuka')).toBe('Yuuka');
  });

  it('returns name unchanged when no tag', () => {
    expect(stripPlayerRoleTag('SomePlayer')).toBe('SomePlayer');
  });

  it('strips tag without space after', () => {
    expect(stripPlayerRoleTag('[M]Player')).toBe('Player');
  });
});
