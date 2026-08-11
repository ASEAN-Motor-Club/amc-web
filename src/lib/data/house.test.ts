import { describe, expect, it } from 'vitest';
import { PUBLIC_HOUSE_PRICE_MULTIPLIER } from '$env/static/public';
import { houses } from './house';
import houseJson from '$lib/assets/data/out_house.json';

const rawHouses = houseJson as { name: string; cost: number; coord: unknown; size: unknown }[];

describe('houses', () => {
  it('applies the configured price multiplier to every house', () => {
    const multiplier = Number(PUBLIC_HOUSE_PRICE_MULTIPLIER) || 1;
    expect(houses).toHaveLength(rawHouses.length);
    houses.forEach((house, index) => {
      expect(house.cost, house.name).toBe(rawHouses[index].cost * multiplier);
    });
  });

  it('preserves the rest of the house data', () => {
    houses.forEach((house, index) => {
      const raw = rawHouses[index];
      expect(house.name).toBe(raw.name);
      expect(house.coord).toEqual(raw.coord);
      expect(house.size).toEqual(raw.size);
    });
  });

  it('never lowers a price', () => {
    for (const house of houses) {
      const raw = rawHouses.find((h) => h.name === house.name);
      expect(house.cost, house.name).toBeGreaterThanOrEqual(raw?.cost ?? 0);
    }
  });
});
