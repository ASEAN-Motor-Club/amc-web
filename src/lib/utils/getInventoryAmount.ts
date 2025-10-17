import type { DeliveryPointInfo } from '$lib/api/types';
import type { DeliveryCargo, DeliveryCargoType } from '$lib/data/types';
import outCargoKey from '$lib/assets/data/out_cargo_key.json';

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

  if (cargoKey.startsWith('_T')) {
    const cargoKeys = outCargoKey[cargoKey as DeliveryCargoType];
    return inventory.reduce(
      (sum, item) => sum + (cargoKeys.includes(item.cargoKey) ? item.amount : 0),
      0,
    );
  }

  return inventory.find((i) => i.cargoKey === cargoKey)?.amount ?? 0;
};
