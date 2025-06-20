import { describe, it, expect } from 'vitest';
import { normalizedWaypoints } from './normalized';
import type { Waypoint } from '$lib/components/TrackEditor/types';

describe('normalizedWaypoints', () => {
  it('should return an empty array when given an empty array', () => {
    const result = normalizedWaypoints([]);
    expect(result).toEqual([]);
  });

  it('should preserve translation and scale3D properties', () => {
    const waypoints: Waypoint[] = [
      {
        translation: { x: 10, y: 20, z: 30 },
        scale3D: { x: 2, y: 3, z: 4 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
      },
      {
        translation: { x: 40, y: 50, z: 60 },
        scale3D: { x: 1.5, y: 2.5, z: 3.5 },
        rotation: { x: 0, y: 0, z: 0.7071, w: 0.7071 },
      },
    ];

    const result = normalizedWaypoints(waypoints);

    expect(result).toHaveLength(2);
    expect(result[0].translation).toEqual(waypoints[0].translation);
    expect(result[0].scale3D).toEqual(waypoints[0].scale3D);
    expect(result[1].translation).toEqual(waypoints[1].translation);
    expect(result[1].scale3D).toEqual(waypoints[1].scale3D);
  });

  it('should reset roll and pitch', () => {
    const waypoints: Waypoint[] = [
      {
        translation: { x: 0, y: 0, z: 0 },
        scale3D: { x: 1, y: 1, z: 1 },
        rotation: {
          w: 0.7626609944088648,
          x: 0.23733900559113516,
          y: 0.4254517622670592,
          z: 0.4254517622670592,
        },
      },
      {
        translation: { x: 10, y: 10, z: 10 },
        scale3D: { x: 1, y: 1, z: 1 },
        rotation: {
          w: 0.7626609944088648,
          x: 0.4254517622670592,
          y: -0.23733900559113516,
          z: 0.4254517622670592,
        },
      },
    ];

    const result = normalizedWaypoints(waypoints);

    expect(result[0].rotation.x).toBeCloseTo(0);
    expect(result[0].rotation.y).toBeCloseTo(0);
    expect(result[1].rotation.x).toBeCloseTo(0);
    expect(result[1].rotation.y).toBeCloseTo(0);
  });

  it('should point toward another point if closer to average', () => {
    const waypoints: Waypoint[] = [
      {
        translation: {
          x: 154156.71861560308,
          y: 342877.14101912355,
          z: -16950,
        },
        scale3D: {
          x: 1,
          y: 16.8,
          z: 10,
        },
        rotation: {
          x: 0,
          y: 0,
          z: -0.7324008462587799,
          w: 0.6808737037068057,
        },
      },
      {
        translation: {
          x: 129827.02032382577,
          y: 312350.31405377376,
          z: -20987.956077107796,
        },
        scale3D: {
          x: 1,
          y: 14,
          z: 10,
        },
        rotation: {
          x: 0,
          y: 0,
          z: -0.6666625702038126,
          w: 0.745359656467431,
        },
      },
      {
        translation: {
          x: 30061.21077028918,
          y: 360551.4222663698,
          z: -7194.950590107797,
        },
        scale3D: {
          x: 1,
          y: 14,
          z: 10,
        },
        rotation: {
          x: 0,
          y: 0,
          z: 0.7372773367875911,
          w: 0.6755902076402506,
        },
      },
    ];

    const result = normalizedWaypoints(waypoints);

    expect(result[1].rotation.x).toBeCloseTo(0);
    expect(result[1].rotation.y).toBeCloseTo(0);
    expect(result[1].rotation.z).toBeCloseTo(0.7453596564674309);
    expect(result[1].rotation.w).toBeCloseTo(0.6666625702038126);
  });

  it('should point toward average if closer than another point', () => {
    const waypoints: Waypoint[] = [
      {
        translation: {
          x: -253337.7063730399,
          y: 1102395.779396583,
          z: -16579.502650710943,
        },
        scale3D: {
          x: 1,
          y: 20,
          z: 10,
        },
        rotation: {
          x: 0,
          y: 0,
          z: 0.12034062477498789,
          w: 0.992732659898306,
        },
      },
      {
        translation: {
          x: -194111.08477428823,
          y: 1114203.2816372234,
          z: -18362.32160579162,
        },
        scale3D: {
          x: 1,
          y: 14,
          z: 10,
        },
        rotation: {
          x: 0,
          y: 0,
          z: -0.05007000493284858,
          w: 0.9987457106821659,
        },
      },
      {
        translation: {
          x: -201163.17795073157,
          y: 1048033.5202178903,
          z: -18881.582684212783,
        },
        scale3D: {
          x: 1,
          y: 14,
          z: 10,
        },
        rotation: {
          x: 0.003356809126570436,
          y: 0.003655982558749689,
          z: -0.6763173287468032,
          w: 0.73659367120605,
        },
      },
    ];

    const result = normalizedWaypoints(waypoints);

    expect(result[1].rotation.x).toBeCloseTo(0);
    expect(result[1].rotation.y).toBeCloseTo(0);
    expect(result[1].rotation.z).toBeCloseTo(-0.05007000493284858);
    expect(result[1].rotation.w).toBeCloseTo(0.9987457106821659);
  });
});
