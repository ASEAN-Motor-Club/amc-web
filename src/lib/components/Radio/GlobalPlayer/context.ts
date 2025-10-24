import { createContext } from 'svelte';

export interface GlobalPlayerContext {
  togglePlay: () => void;
  changeVolume: (value: number) => void;
  isPlaying: boolean;
  readonly volume: number;
  readonly analyser: AnalyserNode | null;
  readonly audioContext: AudioContext | null;
}

const [getGlobalPlayerContext, setGlobalPlayerContext] = createContext<GlobalPlayerContext>();
export { getGlobalPlayerContext, setGlobalPlayerContext };
