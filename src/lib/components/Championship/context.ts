import { createContext } from 'svelte';
import type { ScheduledEvent } from '#lib/api/types.js';

export interface ChampionshipContext {
  readonly events: ScheduledEvent[];
  openEvent: (day: number, month: number, year: number) => void;
}

const [getChampionshipContext, setChampionshipContext] = createContext<ChampionshipContext>();
export { getChampionshipContext, setChampionshipContext };
