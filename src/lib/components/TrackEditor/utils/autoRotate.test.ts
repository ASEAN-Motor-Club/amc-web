import { describe, it, expect } from 'vitest';
import { autoRotateAllWaypoints, autoRotateWaypoint } from './autoRotate';

describe('autoRotate', () => {
  describe('autoRotateWaypoint', () => {
    it('should ignore translation and scale3D', () => {
      const waypoints = [
        {
          translation: { x: 0, y: 0, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
        {
          translation: { x: 1, y: 0, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
        {
          translation: { x: 1, y: 1, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
      ];

      const result = autoRotateWaypoint(waypoints[1], 1, waypoints);
      expect(result.translation).toEqual(waypoints[1].translation);
      expect(result.scale3D).toEqual(waypoints[1].scale3D);
    });

    it('should auto rotate waypoint', () => {
      const waypoints = [
        {
          translation: { x: 0, y: 0, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
        {
          translation: { x: 1, y: 0, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
        {
          translation: { x: 1, y: 1, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
      ];

      const result = autoRotateWaypoint(waypoints[1], 1, waypoints);
      expect(result.rotation.x).toBeCloseTo(0);
      expect(result.rotation.y).toBeCloseTo(0);
      expect(result.rotation.z).toBeCloseTo(0.3826834323650898);
      expect(result.rotation.w).toBeCloseTo(0.9238795325112867);
    });
  });

  describe('autoRotateAllWaypoints', () => {
    it('should ignore translation and scale3D', () => {
      const waypoints = [
        {
          translation: { x: 0, y: 0, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
        {
          translation: { x: 1, y: 0, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
        {
          translation: { x: 1, y: 1, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
      ];

      const result = autoRotateAllWaypoints(waypoints);
      expect(result[0].translation).toEqual(waypoints[0].translation);
      expect(result[0].scale3D).toEqual(waypoints[0].scale3D);

      expect(result[1].translation).toEqual(waypoints[1].translation);
      expect(result[1].scale3D).toEqual(waypoints[1].scale3D);

      expect(result[2].translation).toEqual(waypoints[2].translation);
      expect(result[2].scale3D).toEqual(waypoints[2].scale3D);
    });

    it('should auto rotate waypoints', () => {
      const waypoints = [
        {
          translation: { x: 0, y: 0, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
        {
          translation: { x: 1000, y: 0, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
        {
          translation: { x: 1000, y: 1000, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
        {
          translation: { x: 0, y: 1000, z: 0 },
          scale3D: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0, w: 1 },
        },
      ];

      const result = autoRotateAllWaypoints(waypoints);

      expect(result[0].rotation.x).toBeCloseTo(0);
      expect(result[0].rotation.y).toBeCloseTo(0);
      expect(result[0].rotation.z).toBeCloseTo(-0.3826834323650898);
      expect(result[0].rotation.w).toBeCloseTo(0.9238795325112867);

      expect(result[1].rotation.x).toBeCloseTo(0);
      expect(result[1].rotation.y).toBeCloseTo(0);
      expect(result[1].rotation.z).toBeCloseTo(0.3826834323650898);
      expect(result[1].rotation.w).toBeCloseTo(0.9238795325112867);

      expect(result[2].rotation.x).toBeCloseTo(0);
      expect(result[2].rotation.y).toBeCloseTo(0);
      expect(result[2].rotation.z).toBeCloseTo(0.9238795325112867);
      expect(result[2].rotation.w).toBeCloseTo(0.3826834323650898);

      expect(result[3].rotation.x).toBeCloseTo(0);
      expect(result[3].rotation.y).toBeCloseTo(0);
      expect(result[3].rotation.z).toBeCloseTo(-0.9238795325112867);
      expect(result[3].rotation.w).toBeCloseTo(0.3826834323650898);
    });
  });
});
