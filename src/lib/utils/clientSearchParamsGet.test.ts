import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPage } = vi.hoisted(() => ({
  mockPage: { url: new URL('http://localhost/map?delivery=5&menu=jobs/1') },
}));

vi.mock('$app/state', () => ({
  page: mockPage,
}));

import { clientSearchParams, clientSearchParamsGet } from './clientSearchParamsGet';

// clientSearchParamsGet bails out unless `window` exists; the node test env has none.
beforeEach(() => {
  vi.stubGlobal('window', {});
  mockPage.url = new URL('http://localhost/map?delivery=5&menu=jobs/1');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('clientSearchParamsGet', () => {
  it('returns the value of an existing param', () => {
    expect(clientSearchParamsGet('delivery')).toBe('5');
    expect(clientSearchParamsGet('menu')).toBe('jobs/1');
  });

  it('returns null for a missing param', () => {
    expect(clientSearchParamsGet('house')).toBeNull();
  });

  it('returns an empty string for a present but empty value', () => {
    mockPage.url = new URL('http://localhost/map?player=');
    expect(clientSearchParamsGet('player')).toBe('');
  });

  it('follows page.url updates', () => {
    mockPage.url = new URL('http://localhost/map?house=7');
    expect(clientSearchParamsGet('house')).toBe('7');
    expect(clientSearchParamsGet('delivery')).toBeNull();
  });
});

describe('clientSearchParams', () => {
  it('returns the live URLSearchParams', () => {
    const params = clientSearchParams();
    expect(params.get('delivery')).toBe('5');
  });
});
