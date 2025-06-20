import type { Waypoint } from '$lib/components/TrackEditor/types';
import { WP_EULER_ORDER } from '.';
import { averageRotation } from '../math/rotation/average';
import Quat from 'quaternion';

export const autoRotateWaypoint = (
  wp: Pick<Waypoint, 'translation' | 'scale3D'>,
  index: number,
  array: Waypoint[],
): Waypoint => {
  const numWaypoints = array.length;
  const prevWaypointIdx = (index - 1 + numWaypoints) % numWaypoints;
  const nextWaypointIdx = (index + 1 + numWaypoints) % numWaypoints;

  const averageRot = averageRotation(array[prevWaypointIdx], wp, array[nextWaypointIdx]);

  const q = Quat.fromEuler(0, 0, averageRot, WP_EULER_ORDER);

  return {
    ...wp,
    rotation: {
      x: q.x,
      y: q.y,
      z: q.z,
      w: q.w,
    },
  };
};

export function autoRotateAllWaypoints(waypoints: Waypoint[]): Waypoint[] {
  return waypoints.map((wp, index, array) => autoRotateWaypoint(wp, index, array));
}
