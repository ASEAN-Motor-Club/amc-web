export type Quaternion = {
  x: number;
  y: number;
  z: number;
  w: number;
};

export type Vector2 = {
  x: number;
  y: number;
};

export type Vector3 = {
  x: number;
  y: number;
  z: number;
};

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
