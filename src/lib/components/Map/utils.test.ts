import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPage, mockIsSm } = vi.hoisted(() => ({
  mockPage: { url: new URL('http://localhost/map?delivery=5&player=2&house=3&focus_index=0') },
  mockIsSm: { current: false },
}));

vi.mock('$app/state', () => ({
  page: mockPage,
}));

vi.mock('$lib/utils/media.svelte', () => ({
  isSm: mockIsSm,
}));

import {
  DetailsFeatures,
  Features,
  getLinkHref,
  getSelectionClearedParams,
  getViewHref,
} from './utils';

// getSelectionClearedParams reads page.url.searchParams through clientSearchParams,
// which bails out unless `window` exists; the node test env has none.
beforeEach(() => {
  vi.stubGlobal('window', {});
  mockIsSm.current = false;
  mockPage.url = new URL('http://localhost/map?delivery=5&player=2&house=3&focus_index=0');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('getLinkHref', () => {
  it('builds a full detail route when showFull is set', () => {
    expect(getLinkHref(true, DetailsFeatures.Delivery, '7')).toBe('/deliveries/7');
    expect(getLinkHref(true, DetailsFeatures.Jobs, '12')).toBe('/jobs/12');
  });

  it('builds a map route with a menu param when not full', () => {
    expect(getLinkHref(false, DetailsFeatures.Delivery, '7')).toBe(
      '/map?delivery=7&focus_index=0&menu=deliveries%2F7',
    );
    expect(getLinkHref(false, DetailsFeatures.Jobs, '12')).toBe(
      '/map?delivery=5&player=2&house=3&focus_index=0&menu=jobs%2F12',
    );
  });

  it('drops the other selection params when switching to a delivery', () => {
    expect(getLinkHref(false, DetailsFeatures.Delivery, '7')).not.toContain('player');
    expect(getLinkHref(false, DetailsFeatures.Delivery, '7')).not.toContain('house');
  });

  it('keeps the selection params when opening a jobs menu', () => {
    const href = getLinkHref(false, DetailsFeatures.Jobs, '12');
    expect(href).toContain('player=2');
    expect(href).toContain('house=3');
  });
});

describe('getSelectionClearedParams', () => {
  it('removes every selection param and keeps the rest', () => {
    const params = getSelectionClearedParams();
    expect(params.get('delivery')).toBeNull();
    expect(params.get('player')).toBeNull();
    expect(params.get('house')).toBeNull();
    expect(params.get('focus_index')).toBeNull();
  });

  it('keeps unrelated params such as menu', () => {
    mockPage.url = new URL('http://localhost/map?delivery=5&menu=deliveries%2F5');
    const params = getSelectionClearedParams();
    expect(params.get('menu')).toBe('deliveries/5');
  });
});

describe('getViewHref', () => {
  it('keeps only the selected feature param on wide screens', () => {
    expect(getViewHref(Features.House, '7')).toBe('/map?house=7');
    expect(getViewHref(Features.Player, '9')).toBe('/map?player=9');
    expect(getViewHref(Features.Delivery, '11')).toBe('/map?delivery=11');
  });

  it('adds a menu param on small screens', () => {
    mockIsSm.current = true;
    mockPage.url = new URL('http://localhost/map?delivery=5');
    expect(getViewHref(Features.House, '7')).toBe('/map?menu=housing&house=7');
    expect(getViewHref(Features.Player, '9')).toBe('/map?menu=players&player=9');
    expect(getViewHref(Features.Delivery, '11')).toBe('/map?menu=deliveries%2F11&delivery=11');
  });

  it('skips the menu param on small screens when keepMenu is set', () => {
    mockIsSm.current = true;
    mockPage.url = new URL('http://localhost/map?delivery=5');
    expect(getViewHref(Features.House, '7', true)).toBe('/map?house=7');
  });
});
