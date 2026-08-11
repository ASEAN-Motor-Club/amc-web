import { afterEach, describe, expect, it } from 'vitest';
import { localStorageKey } from '$lib/paraglide/runtime';
import { mtLocale, setLocale, siteLocale } from './locale.svelte';

describe('locale', () => {
  afterEach(() => {
    setLocale('en');
    localStorage.clear();
  });

  it('defaults mtLocale to en', () => {
    expect(mtLocale.l).toBe('en');
  });

  it('setLocale updates siteLocale and persists it to localStorage', () => {
    setLocale('th');
    expect(siteLocale.l).toBe('th');
    expect(localStorage.getItem(localStorageKey)).toBe('th');
  });

  it('setLocale overwrites a previously set locale', () => {
    setLocale('th');
    setLocale('en');
    expect(siteLocale.l).toBe('en');
    expect(localStorage.getItem(localStorageKey)).toBe('en');
  });
});
