import type { HouseData } from '$lib/api/types';

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
    const response = await fetch('https://server.aseanmotorclub.com/api/housing/', {
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
      console.log('Fetch aborted');
      return {};
    }
    console.error('Error fetching housing data:', error);
    return {};
  }
};
