import { mtLocale } from '$lib/components/Locale/locale.svelte';
import type { MtNameRecord } from '$lib/types';

export const getMtLocale = (table: MtNameRecord) => {
  return table[mtLocale.l] || table.en;
};
