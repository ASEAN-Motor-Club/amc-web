import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { ueRotatorToThreeQuaternion, ueToThreePosition } from './coords.ts';

const expectVec = (actual: Vector3, expected: [number, number, number]) => {
  expect(actual.x).toBeCloseTo(expected[0]);
  expect(actual.y).toBeCloseTo(expected[1]);
  expect(actual.z).toBeCloseTo(expected[2]);
};

const rotate = (axis: [number, number, number], pitch: number, yaw: number, roll: number) =>
  new Vector3(...axis).applyQuaternion(ueRotatorToThreeQuaternion({ pitch, yaw, roll }));

describe('ueToThreePosition', () => {
  it('maps UE cm (z up) to three m (y up) relative to the origin', () => {
    const origin = { x: 1000, y: 2000, z: -500 };
    expectVec(ueToThreePosition({ x: 1100, y: 1700, z: -250 }, origin), [1, 2.5, -3]);
  });
});

describe('ueRotatorToThreeQuaternion', () => {
  it('turns UE +X toward UE +Y on positive yaw (three +X toward +Z)', () => {
    expectVec(rotate([1, 0, 0], 0, 90, 0), [0, 0, 1]);
  });

  it('lifts UE +X toward up on positive pitch', () => {
    expectVec(rotate([1, 0, 0], 90, 0, 0), [0, 1, 0]);
  });

  it('tips UE +Y toward down on positive roll', () => {
    expectVec(rotate([0, 0, 1], 0, 0, 90), [0, -1, 0]);
  });

  it('agrees with the position mapping for a yawed offset', () => {
    // A point 1 m ahead of an actor yawed 30° sits at (cos30, sin30) in UE.
    const origin = { x: 0, y: 0, z: 0 };
    const yawRad = (30 * Math.PI) / 180;
    const placed = ueToThreePosition(
      { x: 100 * Math.cos(yawRad), y: 100 * Math.sin(yawRad), z: 0 },
      origin,
    );
    expectVec(rotate([1, 0, 0], 0, 30, 0), [placed.x, placed.y, placed.z]);
  });
});
