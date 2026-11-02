import type { Vector2, Vector3 } from '#lib/types/index.ts';
import houseJson from '#lib/assets/data/out_house.json';
import { PUBLIC_HOUSE_PRICE_MULTIPLIER } from '$app/env/public';

export interface House {
  name: string;
  coord: Vector3;
  size: Vector2;
  /** Plot rotation about the vertical, Unreal degrees (the House actor's yaw). */
  yaw: number;
  /** server rent cost should be divide by 10 */
  cost: number;
}

const priceMultiplier = Number(PUBLIC_HOUSE_PRICE_MULTIPLIER) || 1;

export const houses = (houseJson as House[]).map((h) => ({
  ...h,
  cost: h.cost * priceMultiplier,
}));
