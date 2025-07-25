import type { Track } from '$lib/schema/track';
import type { Vector3 } from '../types';

export type HouseData = Record<string, House>;

export type House = {
  housingKey: string;
  ownerName: string;
  rentLeft: Date;
};

export type PlayerEventData = Record<string, Vector3 & { vehicle_key: string; unique_id: string }>;

export const enum DeliveryLineType {
  Supply,
  Demand,
  Drop,
}

export type EventInfo = {
  route: Track;
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

export type Team = {
  id: number;
  name: string;
  tag: string;
  description: string;
  logo: string | null;
  bg_color: string;
  text_color: string;
};

export type ScheduledEvent = {
  id: number;
  name: string;
  start_time: string;
  end_time: string;
  discord_event_id: string;
  race_setup: number;
  description: string;
};
