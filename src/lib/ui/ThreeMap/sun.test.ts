import { describe, expect, it } from 'vitest';
import { motorTownSun } from './sun.ts';

const at = (hour: number) => motorTownSun(hour);

/**
 * Ground truth from the running game's own
 * `USunPositionFunctionLibrary::GetSunPosition(33, 126, 9, false, 2021, 7, 3, h, 0, 0)`,
 * sampled on the dedicated server and converted with `CorrectedElevation - 180`
 * (the plugin reports elevation from the nadir, and the rotation uses the corrected value).
 */
const ENGINE_SAMPLES = [
  { hour: 0, elevation: -33.2188, azimuth: 348.9211 },
  { hour: 6, elevation: 4.6064, azimuth: 65.4345 },
  { hour: 10, elevation: 53.451, azimuth: 95.5121 },
  { hour: 13, elevation: 79.0221, azimuth: 204.511 },
  { hour: 14, elevation: 69.7753, azimuth: 245.1698 },
  { hour: 16, elevation: 45.2024, azimuth: 270.2687 },
  { hour: 19, elevation: 8.482, azimuth: 291.9099 },
];

describe('motorTownSun', () => {
  it.each(ENGINE_SAMPLES)('matches the game at $hour:00', ({ hour, elevation, azimuth }) => {
    const sun = at(hour);
    expect(sun.elevation).toBeCloseTo(elevation, 1);
    expect(Math.abs(sun.azimuth - azimuth)).toBeLessThan(0.1);
  });

  it('peaks in the early afternoon, not at 12:00', () => {
    const peak = Math.max(...Array.from({ length: 24 }, (_, h) => at(h).elevation));
    expect(at(13).elevation).toBeGreaterThan(78);
    expect(peak).toBeCloseTo(79.02, 1);
  });

  it('rises in the east and sets in the west, never at the same azimuth', () => {
    expect(at(6).azimuth).toBeGreaterThan(60);
    expect(at(6).azimuth).toBeLessThan(70);
    expect(at(19).azimuth).toBeGreaterThan(290);
  });

  it('wraps any time of day into 0-24h', () => {
    expect(at(38).elevation).toBeCloseTo(at(14).elevation, 6);
    expect(motorTownSun(-10).azimuth).toBeCloseTo(at(14).azimuth, 6);
  });
});
