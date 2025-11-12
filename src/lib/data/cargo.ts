import cargoNameJson from '$lib/assets/data/out_cargo_name.json';
import cargoTypeNameJson from '$lib/assets/data/out_cargo_type_name.json';
import cargoMetadataJson from '$lib/assets/data/out_cargo_metadata.json';
import type { DeliveryCargo, DeliveryCargoType, DeliveryCargoKey } from './types';
import type { MtNameRecord } from '$lib/types';

export const cargoName = { ...cargoNameJson, ...cargoTypeNameJson } as Record<
  DeliveryCargo,
  MtNameRecord
>;

export interface CargoMetadata {
  type: DeliveryCargoType;
  minDist?: number;
  maxDist?: number;
}

export const cargoMetadata = cargoMetadataJson as Record<DeliveryCargoKey, CargoMetadata>;
