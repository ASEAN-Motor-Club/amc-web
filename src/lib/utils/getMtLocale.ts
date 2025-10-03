import { mtLocale } from '$lib/components/Locale/locale.svelte';
import type { MtLocaleKey } from '$lib/data/types';

export const getMtLocale = (table: Partial<Record<MtLocaleKey, string>>) => {
  // we know that en always exists
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return table[mtLocale.l] || table.en!;
};
