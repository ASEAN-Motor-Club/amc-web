import type { Vector2, Vector3 } from '#lib/types/index.ts';
import { PUBLIC_HOUSE_VIEWER_API_BASE } from '$app/env/public';
import { createQuery, queryOptions, skipToken } from '@tanstack/svelte-query';
import { apiClient, type QueryOverrides, type QueryParam } from './_api.ts';

/** Unreal rotator, degrees. */
export interface HouseBuildingRotation {
  pitch: number;
  yaw: number;
  roll: number;
}

/** One placed building on the plot — the house shell itself or a piece of furniture. */
export interface HouseBuilding {
  guid: string;
  buildingKey: string;
  buildingStep: number;
  /** `House` for the shell, `Furniture` for everything placed on/in it. */
  rowType: string | null;
  /** Unreal world location, cm. */
  location: Vector3;
  rotation: HouseBuildingRotation;
  /** Absolute URL of the building's GLB (glTF space: meters, Y-up). */
  modelUrl: string;
}

export interface HouseViewerData {
  housingKey: string;
  /** Plot centre, Unreal world cm. */
  coord: Vector3;
  /** Plot extent, cm. */
  size: Vector2;
  /** Plot rotation about the vertical, UE degrees (the House actor's yaw). */
  yaw: number;
  /** Raw `Cost` from the game's Houses table; the site shows rent as `cost × multiplier / 10`. */
  cost: number;
  ownerName: string | null;
  /** Absolute URLs of the landscape grass the plot sits on (UE base color + DirectX normal map). */
  groundTextures: { color: string; normal: string };
  buildings: HouseBuilding[];
}

export interface HouseViewerQueryInput {
  /** Housing key (`FirstHouse`, …); `undefined` parks the query instead of fetching. */
  housingKey: string | undefined;
  /** Overrides spread over the endpoint's defaults. */
  options?: QueryOverrides<HouseViewerData>;
}

/** The server re-reads the 7 MB world dump at most every 30 minutes; no point asking sooner. */
const HOUSE_VIEWER_STALE_MS = 5 * 60 * 1000;

export const houseViewerQueryOptions = (input: QueryParam<HouseViewerQueryInput>) => () => {
  const { housingKey, options } = input();

  return queryOptions({
    queryKey: ['houseViewer', housingKey],
    queryFn:
      housingKey === undefined
        ? skipToken
        : async ({ signal }): Promise<HouseViewerData> => {
            const data = await apiClient<HouseViewerData>(
              `${PUBLIC_HOUSE_VIEWER_API_BASE}/api/houses/${encodeURIComponent(housingKey)}`,
              signal,
            );
            const absolute = (url: string) => new URL(url, PUBLIC_HOUSE_VIEWER_API_BASE).href;
            return {
              ...data,
              groundTextures: {
                color: absolute(data.groundTextures.color),
                normal: absolute(data.groundTextures.normal),
              },
              buildings: data.buildings.map((b) => ({ ...b, modelUrl: absolute(b.modelUrl) })),
            };
          },
    staleTime: HOUSE_VIEWER_STALE_MS,
    ...options,
  });
};

export const createHouseViewerQuery = (input: QueryParam<HouseViewerQueryInput>) =>
  createQuery(houseViewerQueryOptions(input));
