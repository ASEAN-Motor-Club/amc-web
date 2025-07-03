import type { Quaternion, Vector3 } from '$lib/types';

export type Waypoint = {
  rotation: Quaternion;
  translation: Vector3;
  scale3D: Vector3;
};

export type TrackData = {
  routeName?: string;
  waypoints: Waypoint[];
};

export type WaypointEuler = {
  rotation: Vector3;
  translation: Vector3;
  scale3D: Vector3;
};
