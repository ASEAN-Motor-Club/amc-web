import type { Vector2 } from '$lib/types';

export const MAP_REAL_X_LEFT = -1280000;
export const MAP_REAL_Y_TOP = -320000;
export const MAP_REAL_SIZE = 2200000;

export const reProjectPoint = ([x, y]: [number, number]): [number, number] => {
  return [x - MAP_REAL_X_LEFT, -(y - MAP_REAL_Y_TOP) + MAP_REAL_SIZE];
};

export const reProjectPointInverse = ([x, y]: [number, number]): Vector2 => {
  return {
    x: x + MAP_REAL_X_LEFT,
    y: -(y - MAP_REAL_SIZE) + MAP_REAL_Y_TOP,
  };
};

export const reProjectVec2 = ({ x, y }: Vector2): [number, number] => {
  return [x - MAP_REAL_X_LEFT, -(y - MAP_REAL_Y_TOP) + MAP_REAL_SIZE];
};
