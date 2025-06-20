import { describe, it, expect } from 'vitest';
import { averageRotation } from './average';

describe('averageRotation', () => {
  it('should calculate average rotation for straight line', () => {
    const prev = { translation: { x: 0, y: 0, z: 0 } };
    const curr = { translation: { x: 1, y: 0, z: 0 } };
    const next = { translation: { x: 2, y: 0, z: 0 } };

    const result = averageRotation(prev, curr, next);
    expect(result).toBeCloseTo(0); // Straight line, no rotation
  });

  it('should calculate average rotation for 90-degree turn', () => {
    const prev = { translation: { x: 0, y: 0, z: 0 } };
    const curr = { translation: { x: 1, y: 0, z: 0 } };
    const next = { translation: { x: 1, y: 1, z: 0 } };

    const result = averageRotation(prev, curr, next);
    expect(result).toBeCloseTo(Math.PI / 4); // 45 degrees average
  });

  it('should calculate average rotation for 90-degree turn (other direction)', () => {
    const prev = { translation: { x: 0, y: 0, z: 0 } };
    const curr = { translation: { x: 1, y: 0, z: 0 } };
    const next = { translation: { x: 1, y: -1, z: 0 } };

    const result = averageRotation(prev, curr, next);
    expect(result).toBeCloseTo(-Math.PI / 4); // 45 degrees average
  });

  it('should handle all points at same coordinates', () => {
    const prev = { translation: { x: 0, y: 0, z: 0 } };
    const curr = { translation: { x: 0, y: 0, z: 0 } };
    const next = { translation: { x: 0, y: 0, z: 0 } };

    const result = averageRotation(prev, curr, next);
    expect(result).toBeCloseTo(0);
  });

  it('should handle prev and curr at same coordinates', () => {
    const prev = { translation: { x: 0, y: 0, z: 0 } };
    const curr = { translation: { x: 0, y: 0, z: 0 } };
    const next = { translation: { x: 1, y: 1, z: 0 } };

    const result = averageRotation(prev, curr, next);
    expect(result).toBeCloseTo(Math.PI / 8);
  });

  it('should handle curr and next at same coordinates', () => {
    const prev = { translation: { x: 0, y: 0, z: 0 } };
    const curr = { translation: { x: 1, y: 1, z: 0 } };
    const next = { translation: { x: 1, y: 1, z: 0 } };

    const result = averageRotation(prev, curr, next);
    expect(result).toBeCloseTo(Math.PI / 8);
  });

  it('should ignore z-coordinate (2D calculation)', () => {
    const prev = { translation: { x: 0, y: 0, z: 5 } };
    const curr = { translation: { x: 1, y: 0, z: 10 } };
    const next = { translation: { x: 2, y: 0, z: 15 } };

    const result = averageRotation(prev, curr, next);
    expect(result).toBeCloseTo(0); // Straight line in 2D
  });
});
