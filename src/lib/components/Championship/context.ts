import { getContext, setContext } from 'svelte';
import type { ScheduledEvent } from '$lib/api/types';

const key = {};

export interface ChampionshipContext {
  readonly events: ScheduledEvent[];
  openEvent: (day: number, month: number, year: number) => void;
}

export function setChampionshipContext(context: ChampionshipContext) {
  setContext(key, context);
}

export function getChampionshipContext() {
  const context = getContext(key);
  if (context === undefined) {
    throw new Error('Championship context not found. Make sure to set it before using.');
  }
  return context as ChampionshipContext;
}
