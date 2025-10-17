import type { Vector2 } from '$lib/types';

export const enum PointType {
  Delivery,
  House,
  Player,
  Pin,
}

export interface PlayerData {
  geometry: [number, number];
  name: string;
  pointType: PointType.Player;
  coord: Vector2;
  vehicleKey: string | 'None';
  guid: string;
}
