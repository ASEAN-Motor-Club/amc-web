import Quat, { Quaternion } from 'quaternion';
import { WP_EULER_ORDER } from '.';
import { orientation2D } from '$lib/utils/math/vectors';
import { averageRotation } from './average';
import { normalizedRotation } from '$lib/utils/math/rotation/normalized';
import type { Waypoint } from '$lib/schema/track';

export function normalizedWaypoints(waypoints: Waypoint[]): Waypoint[] {
  return waypoints.map((wp, i) => {
    let yaw = new Quaternion(wp.rotation).toEuler(WP_EULER_ORDER)[2];

    const numWaypoints = waypoints.length;
    const prevWaypointIdx = (i - 1 + numWaypoints) % numWaypoints;
    const nextWaypointIdx = (i + 1 + numWaypoints) % numWaypoints;
    const nextWaypointAngle = orientation2D(wp.translation, waypoints[nextWaypointIdx].translation);

    const averageRot = averageRotation(waypoints[prevWaypointIdx], wp, waypoints[nextWaypointIdx]);

    const yawPrime = yaw + -Math.sign(yaw) * Math.PI;

    const primeDiffToAvg = Math.abs(normalizedRotation(yawPrime - averageRot));
    const currDiffToAvg = Math.abs(normalizedRotation(yaw - averageRot));
    const primeDiffToNextWp = Math.abs(normalizedRotation(yawPrime - nextWaypointAngle));
    const currDiffToNextWp = Math.abs(normalizedRotation(yaw - nextWaypointAngle));

    const minValue = Math.min(primeDiffToAvg, currDiffToAvg, primeDiffToNextWp, currDiffToNextWp);
    if (minValue === primeDiffToAvg || minValue === primeDiffToNextWp) {
      yaw = yawPrime;
    }

    const quat = Quat.fromEuler(0, 0, yaw, WP_EULER_ORDER);

    return {
      translation: wp.translation,
      scale3D: wp.scale3D,
      rotation: {
        x: quat.x,
        y: quat.y,
        z: quat.z,
        w: quat.w,
      },
    };
  });
}
