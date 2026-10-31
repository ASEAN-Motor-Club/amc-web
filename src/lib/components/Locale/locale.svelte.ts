import type { MtLocaleKey } from '#lib/data/types.js';
import { baseLocale, localStorageKey, type Locale } from '#lib/paraglide/runtime.js';

export const mtLocale = $state<{ l: MtLocaleKey }>({ l: 'en' });

export const siteLocale = $state<{ l: Locale }>({
  l: baseLocale,
});

export function setLocale(locale: Locale) {
  siteLocale.l = locale;
  localStorage.setItem(localStorageKey, locale);
}
