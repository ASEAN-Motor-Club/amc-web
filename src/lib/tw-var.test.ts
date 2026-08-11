import { describe, expect, it } from 'vitest';
import { adjustOpacity } from './tw-var';

describe('adjustOpacity', () => {
  it('builds a color-mix expression with the given opacity', () => {
    expect(adjustOpacity('#ff0000', 0.5)).toBe('color-mix(in oklab, #ff0000 50%, transparent)');
  });

  it('handles fully opaque and fully transparent', () => {
    expect(adjustOpacity('oklch(0.5 0.1 200)', 1)).toBe(
      'color-mix(in oklab, oklch(0.5 0.1 200) 100%, transparent)',
    );
    expect(adjustOpacity('#fff', 0)).toBe('color-mix(in oklab, #fff 0%, transparent)');
  });
});
