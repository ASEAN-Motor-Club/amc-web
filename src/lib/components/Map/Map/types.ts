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
  /** Names of other teleport points sharing the exact same coordinate */
  aliases?: string[];
  coord: Vector3;
}

/** Point the map locks onto, driven by the URL: "view on map", search, or a map click */
export interface MapSelection {
  pointType: PointType.House | PointType.Delivery | PointType.Player | PointType.Pin;
  /** House name, delivery point guid, player guid, or pin index */
  id: string;
}

export interface PlayerData {
  geometry: [x: number, y: number];
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
  areaName: boolean;
  /** Debug-only: draw area boundary outlines, only toggleable in dev builds */
  areaBound: boolean;
  jobOnly: boolean;
  houseVacantOnly: boolean;
  houseLabels: boolean;
  // playerCopsOnly: boolean;
  // playerCriminalOnly: boolean;
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
  AreaName,
  AreaBound,
}
