import type { Vector2, Vector3 } from '$lib/types';

export const enum PointType {
  Delivery,
  House,
  Player,
  Pin,
  Teleport,
}

export interface TeleportPoint {
  name: string;
  coord: Vector3;
}

export interface PlayerData {
  geometry: [number, number];
  name: string;
  pointType: PointType.Player;
  coord: Vector2;
  vehicleKey: string | 'None';
  guid: string;
}

export const enum PlayerRoles {
  Police,
  Criminal,
}
