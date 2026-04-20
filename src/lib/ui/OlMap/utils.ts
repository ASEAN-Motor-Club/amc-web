export const MAP_REAL_X_LEFT = -1280000;
export const MAP_REAL_Y_TOP = -320000;
export const MAP_REAL_SIZE = 2200000;

/**
 * Convert game-world coordinates to MapLibre [lng, lat].
 *
 * Maps the game pixel space to the full web-mercator world extent so that the
 * tile x/y indices produced by MapLibre match the ones the existing tile files
 * were generated with (i.e. the same grid OpenLayers used for the custom pixel
 * projection).  The inverse-mercator formula is applied to the y-axis so that
 * the latitude spacing matches web-mercator tile boundaries exactly.
 */
export const reProjectPoint = ([xGame, yGame]: [number, number]): [number, number] => {
  const xPixel = xGame - MAP_REAL_X_LEFT;
  const yPixel = MAP_REAL_SIZE + MAP_REAL_Y_TOP - yGame;
  const lng = (xPixel / MAP_REAL_SIZE) * 360 - 180;
  const yNorm = yPixel / MAP_REAL_SIZE;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - 2 * yNorm))) * 180) / Math.PI;
  return [lng, lat];
};

/**
 * Convert MapLibre [lng, lat] back to game-world coordinates.
 */
export const reProjectPointInverse = ([lng, lat]: [number, number]): [number, number] => {
  const xPixel = ((lng + 180) / 360) * MAP_REAL_SIZE;
  const yNorm =
    (1 -
      Math.log(
        Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180),
      ) /
        Math.PI) /
    2;
  const yPixel = yNorm * MAP_REAL_SIZE;
  const xGame = xPixel + MAP_REAL_X_LEFT;
  const yGame = MAP_REAL_SIZE + MAP_REAL_Y_TOP - yPixel;
  return [xGame, yGame];
};
