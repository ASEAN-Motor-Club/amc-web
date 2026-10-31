import { mtLocale } from '#lib/components/Locale/locale.svelte.js';
import type { MtNameRecord } from '#lib/types/index.js';

export const getMtLocale = (table: MtNameRecord) => {
  return table[mtLocale.l] || table.en;
};
