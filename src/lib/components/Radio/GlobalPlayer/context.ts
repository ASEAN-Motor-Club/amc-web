import { createContext } from 'svelte';

export interface GlobalPlayerContext {
  togglePlay: () => void;
  changeVolume: (value: number) => void;
  readonly isPlaying: boolean;
  readonly volume: number;
  /** Null until the first play, because the audio graph is built inside that user gesture. */
  readonly analyser: AnalyserNode | null;
}

const [getGlobalPlayerContext, setGlobalPlayerContext] = createContext<GlobalPlayerContext>();
export { getGlobalPlayerContext, setGlobalPlayerContext };
