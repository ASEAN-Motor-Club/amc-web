import * as THREE from 'three';
import type { Renderer } from 'three/webgpu';
import { describe, expect, it } from 'vitest';
import { getViewBufferSize, getViewCssSize, setViewRect } from './viewRect.ts';

/** The slice of the renderer the helpers touch: a viewport store and a pixel ratio. */
function fakeRenderer(ratio: number) {
  const viewport = new THREE.Vector4();
  const renderer = {
    getPixelRatio: () => ratio,
    setViewport: (x: number, y: number, w: number, h: number) => viewport.set(x, y, w, h),
    getViewport: (target: THREE.Vector4) => target.copy(viewport),
  };
  return { renderer: renderer as unknown as Renderer, viewport };
}

describe('view rect', () => {
  // Fractional ratios are where `floor(css / ratio * ratio)` loses a device pixel to float error.
  const ratios = [1, 1.25, 1.5, 1.75, 2, 2.625];
  const widths = [333, 700.5, 841, 1199, 1400, 1919.5];

  it.each(ratios)(
    'lands on a whole device-pixel count at ratio %s, as three will floor it',
    (ratio) => {
      const { renderer, viewport } = fakeRenderer(ratio);
      for (const width of widths) {
        setViewRect(renderer, width, 777);
        const expected = Math.floor(width * ratio);
        // What three's renderer computes when it applies the viewport.
        expect(Math.floor(viewport.z * ratio)).toBe(expected);
        expect(getViewBufferSize(renderer, new THREE.Vector2()).x).toBe(expected);
      }
    },
  );

  it('reports the CSS size back to within one device pixel', () => {
    const { renderer } = fakeRenderer(1.5);
    setViewRect(renderer, 700.5, 400);
    const css = getViewCssSize(renderer, new THREE.Vector2());
    expect(Math.abs(css.x - 700.5)).toBeLessThan(1 / 1.5);
    expect(css.y).toBeCloseTo(400, 2);
  });

  it('never collapses to an empty viewport', () => {
    const { renderer } = fakeRenderer(2);
    setViewRect(renderer, 0, 0);
    expect(getViewBufferSize(renderer, new THREE.Vector2()).toArray()).toEqual([1, 1]);
  });
});
