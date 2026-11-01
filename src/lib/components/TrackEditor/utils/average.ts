import type { Waypoint } from '#lib/schema/track.ts';
import { orientation2D } from '#lib/utils/math/vectors.ts';
import { normalizedRotation } from '#lib/utils/math/rotation/normalized.ts';

export function averageRotation(
  prevWaypoint: Pick<Waypoint, 'translation'>,
  currWaypoint: Pick<Waypoint, 'translation'>,
  nextWaypoint: Pick<Waypoint, 'translation'>,
) {
  const angleAB = orientation2D(prevWaypoint.translation, currWaypoint.translation);
  const angleBC = orientation2D(currWaypoint.translation, nextWaypoint.translation);
  let averageRotation = (angleAB + angleBC) / 2;

  const avgPrime = averageRotation + -Math.sign(averageRotation) * Math.PI;

  if (
    Math.abs(normalizedRotation(avgPrime - angleBC)) <
    Math.abs(normalizedRotation(averageRotation - angleBC))
  ) {
    averageRotation = avgPrime;
  }

  return averageRotation;
}
