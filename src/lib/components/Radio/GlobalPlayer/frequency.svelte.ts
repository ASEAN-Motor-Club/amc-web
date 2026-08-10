import { prefersReducedMotion } from 'svelte/motion';

/**
 * At `fftSize` 128 and 44.1–48 kHz, bins past this index cover frequencies the stream never
 * carries, so averaging them in would only flatten every band.
 */
const USEFUL_BIN_COUNT = 44;
const BYTE_MAX = 255;

export interface FrequencyBands {
  /** Per-band loudness, 0–1, one entry per requested band. */
  readonly bands: readonly number[];
  /** Loudness across every useful bin, 0–1. */
  readonly average: number;
}

/**
 * Samples an analyser once per frame while it exists and motion is allowed, exposing the result as
 * reactive state. Must be called during component initialization.
 */
export const createFrequencyBands = (
  getAnalyser: () => AnalyserNode | null,
  bandCount: number,
): FrequencyBands => {
  const bands = $state<number[]>(new Array<number>(bandCount).fill(0));
  let average = $state(0);

  $effect(() => {
    const analyser = getAnalyser();
    if (!analyser || prefersReducedMotion.current) {
      return;
    }

    const data = new Uint8Array(analyser.frequencyBinCount);
    const binsPerBand = Math.floor(USEFUL_BIN_COUNT / bandCount);
    let frame = requestAnimationFrame(function sample() {
      analyser.getByteFrequencyData(data);

      let total = 0;
      for (let band = 0; band < bandCount; band++) {
        const start = band * binsPerBand;
        const end = band === bandCount - 1 ? USEFUL_BIN_COUNT : start + binsPerBand;

        let sum = 0;
        for (let bin = start; bin < end; bin++) {
          sum += data[bin];
        }
        total += sum;
        bands[band] = sum / (end - start) / BYTE_MAX;
      }
      average = total / USEFUL_BIN_COUNT / BYTE_MAX;

      frame = requestAnimationFrame(sample);
    });

    return () => {
      cancelAnimationFrame(frame);
      bands.fill(0);
      average = 0;
    };
  });

  return {
    get bands() {
      return bands;
    },
    get average() {
      return average;
    },
  };
};
