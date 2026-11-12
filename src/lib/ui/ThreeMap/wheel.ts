import {
  WHEEL_NOTCH_DELTA_Y,
  ZOOM_LOG_PER_WHEEL_DELTA,
  ZOOM_LOG_PER_WHEEL_NOTCH,
} from './constants.ts';

/**
 * A wheel event as zoom log-units: positive zooms out. Line/page deltas are normalised to pixels
 * like browsers do, and a discrete mouse-wheel DETENT (one big event) gets its own, smaller factor
 * than the many small events of a trackpad gesture, so the inertial accumulator that integrates
 * them feels the same for both.
 */
export function wheelLogDelta(event: WheelEvent): number {
  const px =
    event.deltaMode === 1
      ? event.deltaY * 16
      : event.deltaMode === 2
        ? event.deltaY * 100
        : event.deltaY;
  const perUnit =
    Math.abs(px) >= WHEEL_NOTCH_DELTA_Y ? ZOOM_LOG_PER_WHEEL_NOTCH : ZOOM_LOG_PER_WHEEL_DELTA;
  return px * perUnit;
}
