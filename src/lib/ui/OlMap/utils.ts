export const MAP_REAL_X_LEFT = -1280000;
export const MAP_REAL_Y_TOP = -320000;
export const MAP_REAL_SIZE = 2200000;

export const reProjectPoint = (point: [number, number]): [number, number] => {
  return [point[0] - MAP_REAL_X_LEFT, -(point[1] - MAP_REAL_Y_TOP) + MAP_REAL_SIZE];
};
