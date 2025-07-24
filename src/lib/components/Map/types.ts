import type { Vector2 } from '$lib/types';

export const enum PointType {
  Delivery,
  House,
  Player,
  Pin,
}

export type PlayerData = {
  geometry: [number, number];
  name: string;
  pointType: PointType.Player;
  location: string;
  coord: Vector2;
  vehicleKey: string | 'None';
  guid: string;
};
