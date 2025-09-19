import type { MtLocaleKey } from '$lib/data/types';

export const mtLocale = $state<{ l: MtLocaleKey }>({ l: 'en' });
