import type { DeliveryJob, DeliveryPointInfo } from '$lib/api/types';
import outCargoKey from '$lib/assets/data/out_cargo_key.json';
import type { DeliveryPoint } from '$lib/data/deliveryPoint';
import type { DeliveryCargo, DeliveryCargoKey, DeliveryCargoType } from '$lib/data/types';

export const isCargoType = (cargo: DeliveryCargo): cargo is DeliveryCargoType => {
  return cargo.startsWith('_T');
};

export const flattenCargoType = (cargo: DeliveryCargo): DeliveryCargoKey[] => {
  return isCargoType(cargo)
    ? (outCargoKey[cargo] as DeliveryCargoKey[])
    : [cargo as DeliveryCargoKey];
};

export const getMatchJobSourceFn = (info: DeliveryPoint) => (job: DeliveryJob) =>
  job.cargos.some((cargo) =>
    flattenCargoType(cargo.key).some((cargoKey) => info.allSupplyKey.includes(cargoKey)),
  ) &&
  (job.source_points.length > 0
    ? job.source_points.some((point) => point.guid === info.guid)
    : true);

export const getMatchJobDestFn = (info: DeliveryPoint) => (job: DeliveryJob) =>
  job.cargos.some((cargo) =>
    flattenCargoType(cargo.key).some((cargoKey) => info.allDemandKey.includes(cargoKey)),
  ) &&
  (job.destination_points.length > 0
    ? job.destination_points.some((point) => point.guid === info.guid)
    : true);

export const getInventoryAmount = (
  deliveryPointInfo: DeliveryPointInfo | undefined,
  cargoKey: DeliveryCargo,
  isInput: boolean,
) => {
  if (!deliveryPointInfo) {
    return 0;
  }

  const inventory = isInput
    ? deliveryPointInfo.data.inputInventory
    : deliveryPointInfo.data.outputInventory;
  if (!Array.isArray(inventory)) {
    return 0;
  }

  if (isCargoType(cargoKey)) {
    const cargoKeys = outCargoKey[cargoKey];
    return inventory.reduce(
      (sum, item) => sum + (cargoKeys.includes(item.cargoKey) ? item.amount : 0),
      0,
    );
  }

  return inventory.find((i) => i.cargoKey === cargoKey)?.amount ?? 0;
};
