import { mtLocale } from '#lib/components/Locale/locale.svelte.ts';
import type { MtNameRecord } from '#lib/types/index.ts';

export const getMtLocale = (table: MtNameRecord) => {
  return table[mtLocale.l] || table.en;
};
