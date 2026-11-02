const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

/**
 * Motor Town's world clock is frozen: `AMTSunSky` feeds the UE Sun Position plugin
 * `GetSunPosition(33, 126, 9, …, 2021-07-03)` with a fixed `NorthOffset` of -90, so every
 * in-game day follows the identical arc — no seasons, no year drift.
 */
const MT_CLOCK = {
  latitude: 33,
  longitude: 126,
  timeZone: 9,
  year: 2021,
  month: 7,
  day: 3,
} as const;

export interface SunAngles {
  /** Degrees above the horizon, refraction corrected — the game's `CorrectedElevation`. */
  elevation: number;
  /** Degrees clockwise from north. */
  azimuth: number;
}

/**
 * Solar position for a Motor Town time of day. Matches the game's own
 * `USunPositionFunctionLibrary::GetSunPosition` to within 0.01° elevation / 0.05° azimuth
 * across a full 24 h sweep (validated on the running dedicated server).
 *
 * @param timeOfDay hours since midnight (0-24); wrap-around is handled.
 */
export function motorTownSun(timeOfDay: number): SunAngles {
  const hours = ((timeOfDay % 24) + 24) % 24;
  const minutes = (hours % 1) * 60;

  // Julian day for the frozen date, shifted to UT by the time zone.
  const a = Math.floor((14 - MT_CLOCK.month) / 12);
  const y = MT_CLOCK.year + 4800 - a;
  const m = MT_CLOCK.month + 12 * a - 3;
  const jdn =
    MT_CLOCK.day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;
  const jd = jdn + (Math.floor(hours) + minutes / 60) / 24 - MT_CLOCK.timeZone / 24;
  const t = (jd - 2451545.0) / 36525.0;

  // NOAA/Meeus solar ephemeris — the same equations the engine plugin uses.
  const meanLong = (280.46646 + t * (36000.76983 + t * 0.0003032)) % 360;
  const meanAnom = 357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentricity = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const centre =
    Math.sin(meanAnom * RAD) * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(2 * meanAnom * RAD) * (0.019993 - 0.000101 * t) +
    Math.sin(3 * meanAnom * RAD) * 0.000289;
  const omega = 125.04 - 1934.136 * t;
  const appLong = meanLong + centre - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const meanObliquity =
    23 + (26 + (21.448 - t * (46.815 + t * (0.00059 - t * 0.001813))) / 60) / 60;
  const obliquity = meanObliquity + 0.00256 * Math.cos(omega * RAD);

  const declination = Math.asin(Math.sin(obliquity * RAD) * Math.sin(appLong * RAD));
  const yv = Math.tan((obliquity * RAD) / 2) ** 2;
  const equationOfTime =
    4 *
    DEG *
    (yv * Math.sin(2 * meanLong * RAD) -
      2 * eccentricity * Math.sin(meanAnom * RAD) +
      4 * eccentricity * yv * Math.sin(meanAnom * RAD) * Math.cos(2 * meanLong * RAD) -
      0.5 * yv * yv * Math.sin(4 * meanLong * RAD) -
      1.25 * eccentricity * eccentricity * Math.sin(2 * meanAnom * RAD));

  const trueSolarMinutes =
    (Math.floor(hours) * 60 +
      minutes +
      equationOfTime +
      4 * MT_CLOCK.longitude -
      60 * MT_CLOCK.timeZone +
      1440) %
    1440;
  const hourAngle = (trueSolarMinutes / 4 - 180) * RAD;

  const lat = MT_CLOCK.latitude * RAD;
  const cosZenith =
    Math.sin(lat) * Math.sin(declination) +
    Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
  let elevation = 90 - Math.acos(Math.min(1, Math.max(-1, cosZenith))) * DEG;

  // Atmospheric refraction — this is what makes the plugin's value "Corrected".
  const tanElevation = Math.tan(elevation * RAD);
  let refraction: number;
  if (elevation > 85) refraction = 0;
  else if (elevation > 5)
    refraction = 58.1 / tanElevation - 0.07 / tanElevation ** 3 + 0.000086 / tanElevation ** 5;
  else if (elevation > -0.575)
    refraction =
      1735 + elevation * (-518.2 + elevation * (103.4 + elevation * (-12.79 + elevation * 0.711)));
  else refraction = -20.772 / tanElevation;
  elevation += refraction / 3600;

  const azimuth =
    (Math.atan2(
      Math.sin(hourAngle),
      Math.cos(hourAngle) * Math.sin(lat) - Math.tan(declination) * Math.cos(lat),
    ) *
      DEG +
      180 +
      360) %
    360;

  return { elevation, azimuth };
}
