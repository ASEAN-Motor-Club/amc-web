import { describe, it, expect } from 'vitest';
import {
  MAP_REAL_SIZE,
  MAP_REAL_X_LEFT,
  MAP_REAL_Y_TOP,
  reProjectPoint,
  reProjectPointInverse,
  reProjectVec2,
} from './utils';

describe('reProjectPoint', () => {
  it('moves the game origin into the map extent', () => {
    expect(reProjectPoint([MAP_REAL_X_LEFT, MAP_REAL_Y_TOP])).toEqual([0, MAP_REAL_SIZE]);
  });

  it('inverts through reProjectPointInverse', () => {
    const point: [x: number, y: number] = [500000, -100000];
    expect(reProjectPointInverse(reProjectPoint(point))).toEqual({ x: point[0], y: point[1] });
  });
});

describe('reProjectVec2', () => {
  it('matches reProjectPoint for the same coordinate', () => {
    expect(reProjectVec2({ x: 12345, y: -67890 })).toEqual(reProjectPoint([12345, -67890]));
  });
});
