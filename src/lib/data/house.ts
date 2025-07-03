import type { Vector2, Vector3 } from '$lib/types';
import houseJson from '$lib/assets/data/out_house.json';
import { getLocationAtPoint } from './area';

export type HouseJson = {
  name: string;
  coord: Vector3;
  size: Vector2;
  /** server rent cost should be divide by 10 */
  cost: number;
};

export type House = HouseJson & {
  location: string;
};

export const house = (houseJson as unknown as HouseJson[]).map((dp) => {
  const location = getLocationAtPoint(dp.coord);

  return {
    ...dp,
    location,
  };
});
