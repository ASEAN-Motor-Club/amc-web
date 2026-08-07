import type { HouseData } from '$lib/api/types';
import { PUBLIC_API_BASE } from '$env/static/public';
import { createQuery, queryOptions } from '@tanstack/svelte-query';
import { apiClient, type QueryOverrides, type QueryParam } from './_api';

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

export interface HousingQueryInput {
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<HouseData>;
}

export const housingQueryOptions = (input?: QueryParam<HousingQueryInput>) => () =>
  queryOptions({
    queryKey: ['housing'],
    queryFn: async ({ signal }): Promise<HouseData> => {
      const data = await apiClient<GetHousingDataResponse>(
        `${PUBLIC_API_BASE}/api/housing/`,
        signal,
      );

      return Object.values(data).reduce<HouseData>((acc, value) => {
        acc[value.housingKey] = {
          housingKey: value.housingKey,
          ownerName: value.ownerName,
          rentLeft: new Date(Date.now() + value.rentLeftTimeSeconds * 1000),
        };
        return acc;
      }, {});
    },
    ...input?.().options,
  });

export const createHousingQuery = (input?: QueryParam<HousingQueryInput>) =>
  createQuery(housingQueryOptions(input));
