import { afterEach, describe, expect, it } from 'vitest';
import { mtLocale } from '$lib/components/Locale/locale.svelte';
import { getMtLocale } from './getMtLocale';
import type { MtNameRecord } from '$lib/types';

const table: MtNameRecord = {
  en: 'English name',
  ja: '日本語名',
  'zh-Hans': '中文名',
};

afterEach(() => {
  mtLocale.l = 'en';
});

describe('getMtLocale', () => {
  it('returns the English entry by default', () => {
    expect(getMtLocale(table)).toBe('English name');
  });

  it('returns the entry matching the active locale', () => {
    mtLocale.l = 'ja';
    expect(getMtLocale(table)).toBe('日本語名');
    mtLocale.l = 'zh-Hans';
    expect(getMtLocale(table)).toBe('中文名');
  });

  it('falls back to English when the active locale has no entry', () => {
    mtLocale.l = 'de';
    expect(getMtLocale(table)).toBe('English name');
  });

  it('falls back to English when the record has no English entry either', () => {
    const partial: MtNameRecord = { en: '', ja: 'เท่านั้น' };
    mtLocale.l = 'ja';
    expect(getMtLocale(partial)).toBe('เท่านั้น');
    mtLocale.l = 'fr';
    expect(getMtLocale(partial)).toBe('');
  });
});
