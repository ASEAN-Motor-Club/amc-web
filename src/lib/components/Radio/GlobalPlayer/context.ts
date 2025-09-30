import { getContext, setContext } from 'svelte';

const key = {};
export interface GlobalPlayerContext {
  togglePlay: () => void;
  changeVolume: (value: number) => void;
  isPlaying: boolean;
  readonly volume: number;
  readonly analyser: AnalyserNode | null;
}

export function setGlobalPlayerContext(player: GlobalPlayerContext) {
  setContext(key, player);
}

export function getGlobalPlayerContext() {
  const context = getContext(key);
  if (context === undefined) {
    throw new Error('GlobalPlayer context not found. Make sure to set it before using.');
  }
  return context as GlobalPlayerContext;
}
