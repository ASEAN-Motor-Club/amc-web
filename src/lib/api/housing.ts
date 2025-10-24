import type { HouseData } from '$lib/api/types';
import { PUBLIC_API_BASE } from '$env/static/public';
import { apiClient } from './_api';

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
  const data = await apiClient<GetHousingDataResponse>(
    `${PUBLIC_API_BASE}/api/housing/`,
    signal,
    {},
    'housing data',
  );

  const houseData: HouseData = Object.values(data).reduce<HouseData>((acc, value) => {
    acc[value.housingKey] = {
      housingKey: value.housingKey,
      ownerName: value.ownerName,
      rentLeft: new Date(Date.now() + value.rentLeftTimeSeconds * 1000),
    };
    return acc;
  }, {});

  return houseData;
};
