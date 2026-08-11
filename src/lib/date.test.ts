import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { noop } from 'es-toolkit';
import { defineCustomClientStrategy } from './paraglide/runtime';
import { siteLocale } from './components/Locale/locale.svelte';
import { format, formatDistanceStrict, formatDuration } from './date';

// Mirror the wiring in src/routes/+layout.svelte so getLocale() follows siteLocale state.
beforeAll(() => {
  defineCustomClientStrategy('custom-svelteReactiveLocale', {
    getLocale: () => siteLocale.l,
    setLocale: noop,
  });
});

afterEach(() => {
  siteLocale.l = 'en';
});

describe('format', () => {
  it('formats with the English locale by default', () => {
    expect(format(new Date(2024, 0, 15), 'MMMM')).toBe('January');
    expect(format(new Date(2024, 0, 15), 'P')).toBe('01/15/2024');
  });

  it('switches to the Indonesian locale', () => {
    siteLocale.l = 'id';
    expect(format(new Date(2024, 0, 15), 'MMMM')).toBe('Januari');
  });

  it('switches to the Thai locale', () => {
    siteLocale.l = 'th';
    expect(format(new Date(2024, 0, 15), 'MMMM')).toBe('มกราคม');
  });

  it('passes through custom format options', () => {
    expect(format(new Date(2024, 0, 15), 'eeee', { weekStartsOn: 1 })).toBe('Monday');
  });
});

describe('formatDistanceStrict', () => {
  it('formats a distance with the English locale', () => {
    expect(formatDistanceStrict(new Date(2024, 0, 17), new Date(2024, 0, 15))).toBe('2 days');
  });

  it('switches to the Indonesian locale', () => {
    siteLocale.l = 'id';
    expect(formatDistanceStrict(new Date(2024, 0, 17), new Date(2024, 0, 15))).toBe('2 hari');
  });
});

describe('formatDuration', () => {
  it('formats a duration with the English locale', () => {
    expect(formatDuration({ days: 2, hours: 3 })).toBe('2 days 3 hours');
  });

  it('switches to the Indonesian locale', () => {
    siteLocale.l = 'id';
    expect(formatDuration({ days: 2, hours: 3 })).toBe('2 hari 3 jam');
  });
});
