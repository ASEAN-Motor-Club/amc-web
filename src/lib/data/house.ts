import type { Vector2, Vector3 } from '$lib/types';
import houseJson from '$lib/assets/data/out_house.json';
import { PUBLIC_HOUSE_PRICE_MULTIPLIER } from '$env/static/public';

export interface House {
  name: string;
  coord: Vector3;
  size: Vector2;
  /** server rent cost should be divide by 10 */
  cost: number;
}

const priceMultiplier = Number(PUBLIC_HOUSE_PRICE_MULTIPLIER) || 1;

export const houses = (houseJson as House[]).map((h) => ({
  ...h,
  cost: h.cost * priceMultiplier,
}));
