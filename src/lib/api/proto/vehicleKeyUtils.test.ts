import { describe, expect, it } from 'vitest';
import vehiclesName from '$lib/assets/data/out_vehicles_name.json';
import { VehicleKey } from './generated/player_positions_pb';
import { vehicleKeyToString } from './vehicleKeyUtils';

const NONE_KEY = 'None';

const absentVehicleKeys: VehicleKey[] = [
  VehicleKey.VEHICLE_KEY_UNSPECIFIED,
  VehicleKey.VEHICLE_KEY_NONE,
];

const numericVehicleKeys = Object.values(VehicleKey).filter(
  (value): value is VehicleKey => typeof value === 'number',
);

const namedVehicleKeys = numericVehicleKeys.filter((key) => !absentVehicleKeys.includes(key));

describe('vehicleKeyToString', () => {
  it.each([
    [VehicleKey.VEHICLE_KEY_1, '1'],
    [VehicleKey.VEHICLE_KEY_TUSCAN, 'Tuscan'],
    [VehicleKey.VEHICLE_KEY_ATLAS_6X2_DRYVAN, 'Atlas_6x2_Dryvan'],
    [VehicleKey.VEHICLE_KEY_TRAILER_DINY_FLATBED, 'Trailer_Dinky_Flatbed'],
    [VehicleKey.VEHICLE_KEY_GUNTHOO_POLICE, 'Gunthoo_Police'],
    [VehicleKey.VEHICLE_KEY_GOLIATH10, 'Goliath10'],
    [VehicleKey.VEHICLE_KEY_CIVO, 'Civo'],
    [VehicleKey.VEHICLE_KEY_ELISA2, 'Elisa2'],
    [VehicleKey.VEHICLE_KEY_ELISA2_POLICE, 'Elisa2_Police'],
    [VehicleKey.VEHICLE_KEY_LONGHORN_SEMI_4X2, 'Longhorn_Semi_4x2'],
  ])('maps %i to its vehicle name key', (key, expected) => {
    expect(vehicleKeyToString(key)).toBe(expected);
  });

  it.each(absentVehicleKeys)('maps the absent-vehicle key %i to the None sentinel', (key) => {
    expect(vehicleKeyToString(key)).toBe(NONE_KEY);
  });

  it('maps every named enum member to a real vehicle name key', () => {
    const unresolved = namedVehicleKeys
      .map((key) => [VehicleKey[key], vehicleKeyToString(key)])
      .filter(([, name]) => !Object.hasOwn(vehiclesName, name));

    expect(unresolved).toEqual([]);
  });

  it('maps distinct enum members to distinct vehicle name keys', () => {
    const names = namedVehicleKeys.map((key) => vehicleKeyToString(key));

    expect(new Set(names).size).toBe(names.length);
  });
});
