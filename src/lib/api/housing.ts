import type { HouseData } from '$lib/api/types';
import { PUBLIC_API_BASE } from '$env/static/public';

type GetHousingDataResponse = Record<
  string,
  {
    rentLeft: string;
    housingKey: string;
    ownerUniqueNetId: string;
    ownerCharacterGuid: string;
    ownerName: string;
    rentLeftTimeSeconds: number;
  }
>;

export const getHousingData = async (signal: AbortSignal): Promise<HouseData> => {
  try {
    const response = await fetch(`${PUBLIC_API_BASE}/api/housing/`, {
      signal: signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = (await response.json()) as GetHousingDataResponse;
    const houseData: HouseData = Object.values(data).reduce((acc, value) => {
      acc[value.housingKey] = {
        housingKey: value.housingKey,
        ownerName: value.ownerName,
        rentLeft: new Date(Date.now() + value.rentLeftTimeSeconds * 1000),
      };
      return acc;
    }, {} as HouseData);

    return houseData;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.info('Fetch aborted');
      return {};
    }
    console.error('Error fetching housing data:', error);
    throw error;
  }
};
