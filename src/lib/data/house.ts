import type { Vector2, Vector3 } from '$lib/types';
import houseJson from '$lib/assets/data/out_house.json';

export interface House {
  name: string;
  coord: Vector3;
  size: Vector2;
  /** server rent cost should be divide by 10 */
  cost: number;
}

export const houses = houseJson as House[];
