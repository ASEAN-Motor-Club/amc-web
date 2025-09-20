import type { MtLocaleKey } from '$lib/data/types';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { type Locale, setLocale as paraglideSetLocale, getLocale } from '$lib/paraglide/runtime';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { m as paraglideMsg } from '$lib/paraglide/messages';

export const mtLocale = $state<{ l: MtLocaleKey }>({ l: 'en' });

export const siteLocale = $state<{ l: Locale; readonly msg: typeof paraglideMsg }>({
  l: getLocale(),
  msg: { ...paraglideMsg },
});

export const setLocale = (l: Locale) => {
  paraglideSetLocale(l, { reload: false });

  siteLocale.l = l as Locale;

  // this probably kills tree-shaking
  (siteLocale as { l: Locale; msg: typeof paraglideMsg }).msg = { ...paraglideMsg };
};
