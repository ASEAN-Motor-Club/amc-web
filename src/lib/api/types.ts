import type { TrackData } from '$lib/components/TrackEditor/types';
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

export type EventInfo = {
  route: TrackData;
  best_times: BestTime[];
};

export type BestTime = {
  rank: string;
  name: string;
  unique_id: string;
  disqualified: boolean;
  finished: boolean;
  section_index: number;
  laps: number;
  wrong_vehicle: boolean;
  wrong_engine: boolean;
  last_section_time: number;
  total_time: number;
  last_modified: number;
  event_hash: string;
  net_time: number;
};
