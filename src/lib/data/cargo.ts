import cargoNameJson from '$lib/assets/data/cargo_name.json';
import cargoMetadataJson from '$lib/assets/data/out_cargo_metadata.json';
import type { DeliveryCargo, DeliveryCargoType, DeliveryCargoKey } from './types';

export const cargoName = cargoNameJson as Record<DeliveryCargo, string>;

export type CargoMetadata = {
  type: DeliveryCargoType;
  minDist?: number;
  maxDist?: number;
};

export const cargoMetadata = cargoMetadataJson as Record<DeliveryCargoKey, CargoMetadata>;
