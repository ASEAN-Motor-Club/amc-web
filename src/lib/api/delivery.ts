import { PUBLIC_API_NEW_BASE } from "$env/static/public";
import type { DeliveryPointInfo } from "./types";

export const getDeliveryPointInfos = async (signal: AbortSignal): Promise<DeliveryPointInfo[]> => {
  try {
    const response = await fetch(`${PUBLIC_API_NEW_BASE}/api/delivery_points/`, {
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
