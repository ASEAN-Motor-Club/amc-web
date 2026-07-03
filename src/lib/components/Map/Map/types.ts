import type { Vector2, Vector3 } from '$lib/types';

export const enum PointType {
  Delivery,
  House,
  Player,
  Pin,
  Teleport,
  ShortcutZone,
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

export interface MapState {
  delivery: boolean;
  house: boolean;
  player: boolean;
  playerName: boolean;
  pins: boolean;
  pinLabels: boolean;
  teleport: boolean;
  teleportLabels: boolean;
  shortcutZone: boolean;
  shortcutZoneLabels: boolean;
  jobOnly: boolean;
  houseVacantOnly: boolean;
  houseLabels: boolean;
  playerCopsOnly: boolean;
  playerCriminalOnly: boolean;
}

export const enum PoiType {
  Delivery,
  JobsOnly,
  House,
  HouseLabels,
  HouseVacantOnly,
  Player,
  PlayerName,
  PlayerCopsOnly,
  PlayerCriminalOnly,
  Pins,
  PinLabels,
  Teleport,
  TeleportLabels,
  ShortcutZone,
  ShortcutZoneLabels,
}
