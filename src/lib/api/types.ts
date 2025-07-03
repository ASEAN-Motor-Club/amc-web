import type { Vector2 } from '../types';

export type HouseData = Record<string, House>;

export type House = {
  housingKey: string;
  ownerName: string;
  rentLeft: Date;
};

export type PlayerEventData = Record<string, Vector2>;

export enum DeliveryLineType {
  Supply,
  Demand,
  Drop,
}
