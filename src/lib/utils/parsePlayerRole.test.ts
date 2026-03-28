import { describe, it, expect } from 'vitest';
import { parsePlayerRoles, stripPlayerRoleTag, hasPoliceRole, hasCriminalRole } from './parsePlayerRole';

describe('parsePlayerRoles', () => {
  it('returns empty array for names without role tag', () => {
    expect(parsePlayerRoles('SomePlayer')).toEqual([]);
  });

  it('parses single role without level', () => {
    const roles = parsePlayerRoles('[M] Player');
    expect(roles).toEqual([{ letter: 'M', level: undefined }]);
  });

  it('parses role with level', () => {
    const roles = parsePlayerRoles('[P1] Player');
    expect(roles).toEqual([{ letter: 'P', level: 1 }]);
  });

  it('parses multiple roles with levels', () => {
    const roles = parsePlayerRoles('[P1G1M] Yuuka');
    expect(roles).toEqual([
      { letter: 'P', level: 1 },
      { letter: 'G', level: 1 },
      { letter: 'M', level: undefined },
    ]);
  });

  it('parses role with double-digit level', () => {
    const roles = parsePlayerRoles('[C12] Player');
    expect(roles).toEqual([{ letter: 'C', level: 12 }]);
  });

  it('ignores unknown letters', () => {
    const roles = parsePlayerRoles('[X1P2] Player');
    expect(roles).toEqual([{ letter: 'P', level: 2 }]);
  });

  it('ignores tag without space after bracket', () => {
    expect(parsePlayerRoles('[M]Player')).toEqual([]);
  });

  it('ignores tag without space after bracket even with levels', () => {
    expect(parsePlayerRoles('[P1G1M]Player')).toEqual([]);
  });
});

describe('stripPlayerRoleTag', () => {
  it('strips tag from name', () => {
    expect(stripPlayerRoleTag('[P1G1M] Yuuka')).toBe('Yuuka');
  });

  it('returns name unchanged when no tag', () => {
    expect(stripPlayerRoleTag('SomePlayer')).toBe('SomePlayer');
  });

  it('returns name unchanged when tag has no space after bracket', () => {
    expect(stripPlayerRoleTag('[M]Player')).toBe('[M]Player');
  });
});

describe('hasPoliceRole', () => {
  it('returns true for P role', () => {
    expect(hasPoliceRole('[P] Player')).toBe(true);
  });

  it('returns true for P role with level', () => {
    expect(hasPoliceRole('[P1] Player')).toBe(true);
  });

  it('returns true for P role mixed with other roles', () => {
    expect(hasPoliceRole('[P1G1M] Yuuka')).toBe(true);
  });

  it('returns true for P role with unknown prefix', () => {
    expect(hasPoliceRole('[X1P2] Player')).toBe(true);
  });

  it('returns false for C role only', () => {
    expect(hasPoliceRole('[C12] Player')).toBe(false);
  });

  it('returns false for G role (P in display name)', () => {
    expect(hasPoliceRole('[G] Police')).toBe(false);
  });

  it('returns false for no tag', () => {
    expect(hasPoliceRole('SomePlayer')).toBe(false);
  });

  it('returns false for tag without space after bracket', () => {
    expect(hasPoliceRole('[P]Player')).toBe(false);
  });

  it('returns false for M role only', () => {
    expect(hasPoliceRole('[M] Player')).toBe(false);
  });
});

describe('hasCriminalRole', () => {
  it('returns true for C role', () => {
    expect(hasCriminalRole('[C] Player')).toBe(true);
  });

  it('returns true for C role with level', () => {
    expect(hasCriminalRole('[C12] Player')).toBe(true);
  });

  it('returns true for C role mixed with other roles', () => {
    expect(hasCriminalRole('[C3G1M] Yuuka')).toBe(true);
  });

  it('returns false for P role only', () => {
    expect(hasCriminalRole('[P1] Player')).toBe(false);
  });

  it('returns false for G role (C in display name)', () => {
    expect(hasCriminalRole('[G] Criminal')).toBe(false);
  });

  it('returns false for no tag', () => {
    expect(hasCriminalRole('SomePlayer')).toBe(false);
  });

  it('returns false for tag without space after bracket', () => {
    expect(hasCriminalRole('[C]Player')).toBe(false);
  });

  it('returns false for M role only', () => {
    expect(hasCriminalRole('[M] Player')).toBe(false);
  });
});
