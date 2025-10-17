import { PUBLIC_API_NEW_BASE } from '$env/static/public';
import type { DeliveryPointInfo } from './types';
import { startVisibilityAwarePolling } from './_api';

export const getDeliveryPointInfos = async (signal: AbortSignal): Promise<DeliveryPointInfo[]> => {
  try {
    const response = await fetch(`${PUBLIC_API_NEW_BASE}/api/deliverypoints/`, {
      signal: signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as DeliveryPointInfo[];

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.info('Fetch aborted');
      return [];
    }
    console.error('Error fetching delivery point:', error);
    throw error;
  }
};

export const getDeliveryPointInfo = async (
  id: string,
  signal: AbortSignal,
): Promise<DeliveryPointInfo | undefined> => {
  try {
    const response = await fetch(`${PUBLIC_API_NEW_BASE}/api/deliverypoints/${id}`, {
      signal: signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as DeliveryPointInfo;

    return data;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.info('Fetch aborted');
      return undefined;
    }
    console.error('Error fetching delivery point:', error);
    throw error;
  }
};

export const startDeliveryPointPolling = (
  id: string,
  callback: (deliveryPoint: DeliveryPointInfo | undefined) => void,
  interval = 10000, // 10 seconds
): (() => void) => {
  return startVisibilityAwarePolling(
    'Delivery point',
    (signal) => getDeliveryPointInfo(id, signal),
    callback,
    interval,
  );
};
