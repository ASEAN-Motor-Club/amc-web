import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { tick } from 'svelte';
import { createFrequencyBands, type FrequencyBands } from './frequency.svelte';

interface FakeAnalyser {
  frequencyBinCount: number;
  getByteFrequencyData: (data: Uint8Array) => void;
}

const analyser = (fill: number): FakeAnalyser => ({
  frequencyBinCount: 128,
  getByteFrequencyData: (data) => data.fill(fill),
});

describe('createFrequencyBands', () => {
  let rafCb: ((t: number) => void) | null;
  let rafCalls: number;
  let cancelSpy: Mock;
  let dispose: (() => void) | undefined;
  let result: FrequencyBands | undefined;

  beforeEach(() => {
    rafCb = null;
    rafCalls = 0;
    cancelSpy = vi.fn();
    vi.stubGlobal('requestAnimationFrame', (cb: (t: number) => void) => {
      rafCb = cb;
      rafCalls += 1;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', cancelSpy);
  });

  afterEach(() => {
    dispose?.();
    dispose = undefined;
    result = undefined;
    vi.unstubAllGlobals();
  });

  /**
   * Runs `createFrequencyBands` inside an effect root so the test drives the same lifecycle a
   * component would, then waits a tick for the sampling effect to schedule its first frame.
   */
  const mount = async (getAnalyser: () => AnalyserNode | null) => {
    dispose = $effect.root(() => {
      result = createFrequencyBands(getAnalyser, 4);
    });
    await tick();
  };

  const runFrame = async () => {
    rafCb?.(0);
    await tick();
  };

  /** Returns the mounted result, throwing if the effect root never produced one. */
  const bands = (): FrequencyBands => {
    if (!result) {
      throw new Error('createFrequencyBands returned no result');
    }
    return result;
  };

  it('samples the analyser and computes per-band and average loudness', async () => {
    await mount(() => analyser(50) as unknown as AnalyserNode);
    expect(rafCalls).toBe(1);

    await runFrame();

    expect(bands().bands).toHaveLength(4);
    for (const band of bands().bands) {
      expect(band).toBeCloseTo(50 / 255, 5);
    }
    expect(bands().average).toBeCloseTo(50 / 255, 5);
  });

  it('normalizes sampled data to 0-1', async () => {
    await mount(() => analyser(255) as unknown as AnalyserNode);

    await runFrame();

    for (const band of bands().bands) {
      expect(band).toBeCloseTo(1, 5);
    }
    expect(bands().average).toBeCloseTo(1, 5);
  });

  it('schedules no frame when there is no analyser', async () => {
    await mount(() => null);

    expect(rafCalls).toBe(0);
    expect(rafCb).toBeNull();
  });

  it('disposing the root cancels the loop and resets the bands', async () => {
    await mount(() => analyser(50) as unknown as AnalyserNode);
    await runFrame();
    expect(bands().bands[0]).toBeCloseTo(50 / 255, 5);

    dispose?.();
    dispose = undefined;

    expect(cancelSpy).toHaveBeenCalled();
    expect(bands().bands).toEqual([0, 0, 0, 0]);
    expect(bands().average).toBe(0);
  });
});
