import { describe, it, expect } from 'vitest';
import { normalizedRotation } from './normalized';

describe('normalizedRotation', () => {
  it('should normalize angles within (-π, π] range', () => {
    expect(normalizedRotation(0)).toBe(0);
    expect(normalizedRotation(Math.PI)).toBe(Math.PI);
    expect(normalizedRotation(-Math.PI)).toBe(Math.PI);
    expect(normalizedRotation(Math.PI / 2)).toBeCloseTo(Math.PI / 2);
    expect(normalizedRotation(-Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
  });

  it('should wrap angles greater than π', () => {
    expect(normalizedRotation(Math.PI + 0.1)).toBeCloseTo(-Math.PI + 0.1);
    expect(normalizedRotation(2 * Math.PI)).toBeCloseTo(0);
    expect(normalizedRotation(3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizedRotation((5 * Math.PI) / 2)).toBeCloseTo(Math.PI / 2);
  });

  it('should wrap angles less than -π', () => {
    expect(normalizedRotation(-Math.PI - 0.1)).toBeCloseTo(Math.PI - 0.1);
    expect(normalizedRotation(-2 * Math.PI)).toBeCloseTo(0);
    expect(normalizedRotation(-3 * Math.PI)).toBeCloseTo(Math.PI);
    expect(normalizedRotation((-5 * Math.PI) / 2)).toBeCloseTo(-Math.PI / 2);
  });

  it('should handle large angles', () => {
    // this is too large to be normalized without losing precision but we can ensure it is within the range
    expect(normalizedRotation(1000000000001 * Math.PI)).toBeLessThanOrEqual(Math.PI);
    expect(normalizedRotation(-1000000000001 * Math.PI)).toBeGreaterThanOrEqual(-Math.PI);
    expect(normalizedRotation(1000000000000.5 * Math.PI)).toBeCloseTo(Math.PI / 2);
    expect(normalizedRotation(-1000000000000.5 * Math.PI)).toBeCloseTo(-Math.PI / 2);
  });
});
