import { describe, it, expect } from 'vitest';
import { fromEulerWp, toEulerWp } from './index';
import type { Waypoint, WaypointEuler } from '$lib/schema/track';

describe('waypoint utilities', () => {
  const deg30Quat = {
    w: 0.9659258262890683,
    x: 0,
    y: 0,
    z: 0.25881904510252074,
  };

  describe('fromEulerWp', () => {
    it('should preserve translation and scale values', () => {
      const eulerWp: WaypointEuler = {
        translation: { x: 10, y: -5, z: 3.5 },
        scale3D: { x: 2, y: 0.5, z: 1.5 },
        rotation: { x: 45, y: 30, z: 60 },
      };

      const result = fromEulerWp(eulerWp);

      expect(result.translation).toEqual({ x: 10, y: -5, z: 3.5 });
      expect(result.scale3D).toEqual({ x: 2, y: 0.5, z: 1.5 });
    });

    it('should convert Euler waypoint to quaternion waypoint (degrees)', () => {
      const eulerWp: WaypointEuler = {
        translation: { x: 1, y: 2, z: 3 },
        scale3D: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: 30 },
      };

      const result = fromEulerWp(eulerWp);

      expect(result.rotation.x).toBeCloseTo(deg30Quat.x);
      expect(result.rotation.y).toBeCloseTo(deg30Quat.y);
      expect(result.rotation.z).toBeCloseTo(deg30Quat.z);
      expect(result.rotation.w).toBeCloseTo(deg30Quat.w);
    });

    it('should convert Euler waypoint to quaternion waypoint (radians)', () => {
      const eulerWp: WaypointEuler = {
        translation: { x: 0, y: 0, z: 0 },
        scale3D: { x: 1, y: 1, z: 1 },
        rotation: { x: 0, y: 0, z: Math.PI / 6 },
      };

      const result = fromEulerWp(eulerWp, false);

      expect(result.rotation.x).toBeCloseTo(deg30Quat.x);
      expect(result.rotation.y).toBeCloseTo(deg30Quat.y);
      expect(result.rotation.z).toBeCloseTo(deg30Quat.z);
      expect(result.rotation.w).toBeCloseTo(deg30Quat.w);
    });
  });

  describe('toEulerWp', () => {
    it('should preserve translation and scale values', () => {
      const eulerWp: Waypoint = {
        translation: { x: 10, y: -5, z: 3.5 },
        scale3D: { x: 2, y: 0.5, z: 1.5 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      };

      const result = toEulerWp(eulerWp);

      expect(result.translation).toEqual({ x: 10, y: -5, z: 3.5 });
      expect(result.scale3D).toEqual({ x: 2, y: 0.5, z: 1.5 });
    });

    it('should convert quaternion waypoint to Euler waypoint (degrees)', () => {
      const quaternionWp: Waypoint = {
        translation: { x: 1, y: 2, z: 3 },
        scale3D: { x: 1, y: 1, z: 1 },
        rotation: { ...deg30Quat },
      };

      const result = toEulerWp(quaternionWp);

      expect(result.translation).toEqual({ x: 1, y: 2, z: 3 });
      expect(result.scale3D).toEqual({ x: 1, y: 1, z: 1 });
      expect(result.rotation.x).toBeCloseTo(0);
      expect(result.rotation.y).toBeCloseTo(0);
      expect(result.rotation.z).toBeCloseTo(30);
    });

    it('should convert quaternion waypoint to Euler waypoint (radians)', () => {
      const quaternionWp: Waypoint = {
        translation: { x: 0, y: 0, z: 0 },
        scale3D: { x: 1, y: 1, z: 1 },
        rotation: { ...deg30Quat },
      };

      const result = toEulerWp(quaternionWp, false);

      expect(result.rotation.x).toBeCloseTo(0);
      expect(result.rotation.y).toBeCloseTo(0);
      expect(result.rotation.z).toBeCloseTo(Math.PI / 6);
    });
  });

  describe('round-trip conversion', () => {
    it('should maintain values through Euler -> Quaternion -> Euler conversion', () => {
      const originalEuler: WaypointEuler = {
        translation: { x: 5, y: -3, z: 2 },
        scale3D: { x: 1.5, y: 2, z: 0.5 },
        rotation: { x: 30, y: 45, z: 60 },
      };

      const quaternion = fromEulerWp(originalEuler);
      const backToEuler = toEulerWp(quaternion);

      expect(backToEuler.translation).toEqual(originalEuler.translation);
      expect(backToEuler.scale3D).toEqual(originalEuler.scale3D);
      expect(backToEuler.rotation.x).toBeCloseTo(originalEuler.rotation.x, 5);
      expect(backToEuler.rotation.y).toBeCloseTo(originalEuler.rotation.y, 5);
      expect(backToEuler.rotation.z).toBeCloseTo(originalEuler.rotation.z, 5);
    });

    it('should maintain values through Quaternion -> Euler -> Quaternion conversion', () => {
      const originalQuaternion: Waypoint = {
        translation: { x: -1, y: 7, z: 0.5 },
        scale3D: { x: 2, y: 1, z: 3 },
        rotation: {
          w: 0.8923991008325228,
          x: 0.2392983371500247,
          y: 0.3696438106143861,
          z: 0.09904576054128762,
        },
      };

      const euler = toEulerWp(originalQuaternion);
      const backToQuaternion = fromEulerWp(euler);

      expect(backToQuaternion.translation).toEqual(originalQuaternion.translation);
      expect(backToQuaternion.scale3D).toEqual(originalQuaternion.scale3D);
      expect(backToQuaternion.rotation.x).toBeCloseTo(originalQuaternion.rotation.x, 3);
      expect(backToQuaternion.rotation.y).toBeCloseTo(originalQuaternion.rotation.y, 3);
      expect(backToQuaternion.rotation.z).toBeCloseTo(originalQuaternion.rotation.z, 3);
      expect(backToQuaternion.rotation.w).toBeCloseTo(originalQuaternion.rotation.w, 3);
    });
  });
});
