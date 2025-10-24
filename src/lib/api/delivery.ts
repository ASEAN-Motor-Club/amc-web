import { PUBLIC_API_NEW_BASE } from '$env/static/public';
import type { DeliveryJob, DeliveryPointInfo } from './types';
import { apiClient, startVisibilityAwarePolling } from './_api';

export const getDeliveryPointInfos = async (signal: AbortSignal): Promise<DeliveryPointInfo[]> => {
  return apiClient(`${PUBLIC_API_NEW_BASE}/api/deliverypoints/`, signal, [], 'delivery points');
};

export const getDeliveryPointInfo = async (
  id: string,
  signal: AbortSignal,
): Promise<DeliveryPointInfo | undefined> => {
  return apiClient(
    `${PUBLIC_API_NEW_BASE}/api/deliverypoints/${id}`,
    signal,
    undefined,
    'delivery point',
  );
};

export const startDeliveryPointPolling = (
  id: string,
  callback: (deliveryPoint: DeliveryPointInfo | undefined) => void,
  abortSignal: AbortSignal,
  interval = 10000, // 10 seconds
) => {
  startVisibilityAwarePolling(
    'Delivery point',
    (signal) => getDeliveryPointInfo(id, signal),
    callback,
    () => undefined,
    interval,
    abortSignal,
  );
};

export const getDeliveryJobs = async (signal: AbortSignal): Promise<DeliveryJob[]> => {
  return apiClient(`${PUBLIC_API_NEW_BASE}/deliveryjobs/`, signal, [], 'delivery jobs');
};

export const startDeliveryJobsPolling = (
  callback: (deliveryJobs: DeliveryJob[]) => void,
  abortSignal: AbortSignal,
  interval = 10000, // 10 seconds
) => {
  startVisibilityAwarePolling(
    'Delivery jobs',
    (signal) => getDeliveryJobs(signal),
    callback,
    () => [],
    interval,
    abortSignal,
  );
};
