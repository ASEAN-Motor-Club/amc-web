import Quat, { Quaternion } from 'quaternion';
import { toDeg, toRad } from '$lib/utils/math/vectors';
import type { Waypoint, WaypointEuler } from '$lib/schema/track';

export const WP_EULER_ORDER = 'XYZ';

/**
 * Converts a waypoint in Euler angles to a waypoint in quaternion representation.
 * @param euWp Waypoint in Euler angles
 * @param [deg=true] Whether the angles are in degrees (default: true)
 * @returns Waypoint in quaternion representation
 */
export const fromEulerWp = (euWp: WaypointEuler, deg = true): Waypoint => {
  let rotationX = euWp.rotation.x;
  let rotationY = euWp.rotation.y;
  let rotationZ = euWp.rotation.z;
  if (deg) {
    rotationX = toRad(rotationX);
    rotationY = toRad(rotationY);
    rotationZ = toRad(rotationZ);
  }

  const quat = Quat.fromEuler(rotationX, rotationY, rotationZ, WP_EULER_ORDER);

  return {
    translation: {
      x: euWp.translation.x,
      y: euWp.translation.y,
      z: euWp.translation.z,
    },
    scale3D: {
      x: euWp.scale3D.x,
      y: euWp.scale3D.y,
      z: euWp.scale3D.z,
    },
    rotation: {
      x: quat.x,
      y: quat.y,
      z: quat.z,
      w: quat.w,
    },
  };
};

/**
 * Converts a waypoint in quaternion representation to a waypoint in Euler angles.
 * @param wp Waypoint in quaternion representation
 * @param [deg=true] Whether the angles are in degrees (default: true)
 * @returns Waypoint in Euler angles
 */
export const toEulerWp = (wp: Waypoint, deg = true): WaypointEuler => {
  const quat = new Quaternion(wp.rotation);
  const euler = quat.toEuler(WP_EULER_ORDER);

  let rotationX = euler[0];
  let rotationY = euler[1];
  let rotationZ = euler[2];

  if (deg) {
    rotationX = toDeg(rotationX);
    rotationY = toDeg(rotationY);
    rotationZ = toDeg(rotationZ);
  }

  return {
    translation: {
      x: wp.translation.x,
      y: wp.translation.y,
      z: wp.translation.z,
    },
    scale3D: {
      x: wp.scale3D.x,
      y: wp.scale3D.y,
      z: wp.scale3D.z,
    },
    rotation: {
      x: rotationX,
      y: rotationY,
      z: rotationZ,
    },
  };
};
