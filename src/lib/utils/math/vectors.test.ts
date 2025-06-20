import { describe, it, expect } from 'vitest';
import { orientation2D, toDeg, toRad } from './vectors';
import type { Vector3 } from '$lib/components/TrackEditor/types';

describe('vectors', () => {
  describe('orientation2D', () => {
    it('should calculate orientation from one point to another', () => {
      const from: Vector3 = { x: 0, y: 0, z: 0 };
      const to: Vector3 = { x: 1, y: 1, z: 0 };

      const result = orientation2D(from, to);
      expect(result).toBeCloseTo(Math.PI / 4); // 45 degrees in radians
    });

    it('should handle horizontal movement (positive x)', () => {
      const from: Vector3 = { x: 0, y: 0, z: 0 };
      const to: Vector3 = { x: 1, y: 0, z: 0 };

      const result = orientation2D(from, to);
      expect(result).toBeCloseTo(0); // 0 degrees
    });

    it('should handle vertical movement (positive y)', () => {
      const from: Vector3 = { x: 0, y: 0, z: 0 };
      const to: Vector3 = { x: 0, y: 1, z: 0 };

      const result = orientation2D(from, to);
      expect(result).toBeCloseTo(Math.PI / 2); // 90 degrees in radians
    });

    it('should handle negative x movement', () => {
      const from: Vector3 = { x: 0, y: 0, z: 0 };
      const to: Vector3 = { x: -1, y: 0, z: 0 };

      const result = orientation2D(from, to);
      expect(result).toBeCloseTo(Math.PI); // 180 degrees in radians
    });

    it('should handle negative y movement', () => {
      const from: Vector3 = { x: 0, y: 0, z: 0 };
      const to: Vector3 = { x: 0, y: -1, z: 0 };

      const result = orientation2D(from, to);
      expect(result).toBeCloseTo(-Math.PI / 2); // -90 degrees in radians
    });

    it('should handle diagonal movement (negative x, positive y)', () => {
      const from: Vector3 = { x: 0, y: 0, z: 0 };
      const to: Vector3 = { x: -1, y: 1, z: 0 };

      const result = orientation2D(from, to);
      expect(result).toBeCloseTo((3 * Math.PI) / 4); // 135 degrees in radians
    });

    it('should handle same point (no movement)', () => {
      const from: Vector3 = { x: 5, y: 5, z: 5 };
      const to: Vector3 = { x: 5, y: 5, z: 10 }; // z difference doesn't matter for 2D

      const result = orientation2D(from, to);
      expect(result).toBe(0);
    });

    it('should work with non-zero starting points', () => {
      const from: Vector3 = { x: 10, y: 20, z: 0 };
      const to: Vector3 = { x: 11, y: 21, z: 0 };

      const result = orientation2D(from, to);
      expect(result).toBeCloseTo(Math.PI / 4); // 45 degrees in radians
    });
  });

  describe('toDeg', () => {
    it('should convert radians to degrees', () => {
      expect(toDeg(0)).toBe(0);
      expect(toDeg(Math.PI)).toBeCloseTo(180);
      expect(toDeg(Math.PI / 2)).toBeCloseTo(90);
      expect(toDeg(Math.PI / 4)).toBeCloseTo(45);
      expect(toDeg(2 * Math.PI)).toBeCloseTo(360);
    });

    it('should handle negative radians', () => {
      expect(toDeg(-Math.PI)).toBeCloseTo(-180);
      expect(toDeg(-Math.PI / 2)).toBeCloseTo(-90);
      expect(toDeg(-Math.PI / 4)).toBeCloseTo(-45);
    });

    it('should handle decimal radians', () => {
      expect(toDeg(1)).toBeCloseTo(57.2958); // 1 radian ≈ 57.2958 degrees
      expect(toDeg(0.5)).toBeCloseTo(28.6479);
    });
  });

  describe('toRad', () => {
    it('should convert degrees to radians', () => {
      expect(toRad(0)).toBe(0);
      expect(toRad(180)).toBeCloseTo(Math.PI);
      expect(toRad(90)).toBeCloseTo(Math.PI / 2);
      expect(toRad(45)).toBeCloseTo(Math.PI / 4);
      expect(toRad(360)).toBeCloseTo(2 * Math.PI);
    });

    it('should handle negative degrees', () => {
      expect(toRad(-180)).toBeCloseTo(-Math.PI);
      expect(toRad(-90)).toBeCloseTo(-Math.PI / 2);
      expect(toRad(-45)).toBeCloseTo(-Math.PI / 4);
    });

    it('should handle decimal degrees', () => {
      expect(toRad(57.2958)).toBeCloseTo(1); // ≈ 1 radian
      expect(toRad(28.6479)).toBeCloseTo(0.5);
    });
  });

  describe('conversion round-trip', () => {
    it('should maintain precision when converting back and forth', () => {
      const originalDeg = 123.456;
      const rad = toRad(originalDeg);
      const backToDeg = toDeg(rad);
      expect(backToDeg).toBeCloseTo(originalDeg);

      const originalRad = 2.345;
      const deg = toDeg(originalRad);
      const backToRad = toRad(deg);
      expect(backToRad).toBeCloseTo(originalRad);
    });
  });
});
