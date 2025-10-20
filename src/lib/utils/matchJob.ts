import type { DeliveryJob } from '$lib/api/types';
import outCargoKey from '$lib/assets/data/out_cargo_key.json';
import type { DeliveryPoint } from '$lib/data/deliveryPoint';
import type { DeliveryCargo, DeliveryCargoKey, DeliveryCargoType } from '$lib/data/types';

const flattenCargoType = (cargo: DeliveryCargo): DeliveryCargoKey[] => {
  return cargo.startsWith('_T')
    ? (outCargoKey[cargo as DeliveryCargoType] as DeliveryCargoKey[])
    : [cargo as DeliveryCargoKey];
};

export const getMatchJobFn = (info: DeliveryPoint) => (job: DeliveryJob) =>
  job.cargos.some((cargo) =>
    flattenCargoType(cargo.key).some((cargoKey) => info.allSupplyKey.includes(cargoKey)),
  ) &&
  (job.source_points.length > 0
    ? job.source_points.some((point) => point.guid === info.guid)
    : true);
