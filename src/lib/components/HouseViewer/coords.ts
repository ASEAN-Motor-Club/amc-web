import { Matrix4, Quaternion, Vector3 } from 'three';
import type { Vector3 as GameVector3 } from '#lib/types/index.ts';
import type { HouseBuildingRotation } from '#lib/api/houseViewer.ts';

const CM_PER_M = 100;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Unreal → three basis: UE is left-handed Z-up in cm (x forward, y right), three is
 * right-handed Y-up in m. Same swap the house-server GLB exporter (and FModel/CUE4Parse's glTF
 * export) applies — three (x, y, z) = UE (x, z, y) / 100 — so building models and their
 * placements agree. It is a mirror, which is exactly the handedness fix; seen from above
 * (+Y, screen-up = -Z) UE x is still right and UE y still down, like the 2D map.
 */
export const ueToThreePosition = (coord: GameVector3, origin: GameVector3): Vector3 =>
  new Vector3(
    (coord.x - origin.x) / CM_PER_M,
    (coord.z - origin.z) / CM_PER_M,
    (coord.y - origin.y) / CM_PER_M,
  );

/**
 * UE `FRotator` (degrees) → three quaternion, via UE's own `FRotationMatrix` rows conjugated
 * by the axis swap above. UE yaw +90 turns +X into +Y, i.e. three +X into +Z.
 */
export const ueRotatorToThreeQuaternion = ({
  pitch,
  yaw,
  roll,
}: HouseBuildingRotation): Quaternion => {
  const [sp, cp] = [Math.sin(pitch * DEG_TO_RAD), Math.cos(pitch * DEG_TO_RAD)];
  const [sy, cy] = [Math.sin(yaw * DEG_TO_RAD), Math.cos(yaw * DEG_TO_RAD)];
  const [sr, cr] = [Math.sin(roll * DEG_TO_RAD), Math.cos(roll * DEG_TO_RAD)];

  // Images of the UE unit axes (FRotationMatrix rows).
  const ueX = [cp * cy, cp * sy, sp];
  const ueY = [sr * sp * cy - cr * sy, sr * sp * sy + cr * cy, -sr * cp];
  const ueZ = [-(cr * sp * cy + sr * sy), cy * sr - cr * sp * sy, cr * cp];

  // three X = UE X, three Y = UE Z, three Z = UE Y; each image swaps its own y/z too.
  const toThree = ([x, y, z]: number[]) => new Vector3(x, z, y);
  const basis = new Matrix4().makeBasis(toThree(ueX), toThree(ueZ), toThree(ueY));
  return new Quaternion().setFromRotationMatrix(basis);
};
