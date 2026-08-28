import {
  colorAmber300,
  colorAmber950,
  colorBlue600,
  colorCyan500,
  colorCyan950,
  colorEmerald400,
  colorEmerald950,
  colorGreen600,
  colorOrange500,
  colorRed400,
  colorRed950,
  colorViolet400,
  colorViolet950,
  colorYellow500,
  colorYellow950,
} from '$lib/tw-var';

export const ROTATE_SPEED_NEAR = 0.15;
export const ROTATE_SPEED_FAR = 1.0;
export const ZOOM_LOG_PER_WHEEL_DELTA = 0.0012;

/** Factor for a discrete wheel DETENT (mouse wheel notch, |deltaY| >= 50 in one
 * event). Smaller than the gesture factor because a notch lands whole in the
 * inertial accumulator (~2.9x damping gain), while trackpad gestures drip in.
 * Net per notch: exp(0.00055 * 100 / 0.35) ~= x1.17. */
export const ZOOM_LOG_PER_WHEEL_NOTCH = 0.00055;
/** A wheel event counts as a detent at or above this |deltaY| (px). */
export const WHEEL_NOTCH_DELTA_Y = 50;

/** Zoom-button step in log-distance units, deliberately decoupled from
 * ZOOM_LOG_PER_WHEEL_DELTA: wheel deltas come straight from input hardware and
 * must stay hand-tunable without changing how far one +/- click steps.
 * Negative zooms in, matching the wheel's positive-deltaY-zooms-out sign. */
export const ZOOM_BUTTON_LOG_STEP = -0.2;
export const ZOOM_DAMPING_FACTOR = 0.35;
export const PAN_DAMPING_FACTOR = 0.35;
export const PAN_FLING_SAMPLE_MS = 90;
/** Selection glide: fixed easing duration centering a selected POI, matching
 * the 2D map's 600ms view animation. Under a one-meter snap gap the flight is
 * skipped and the residual consumed instantly. */
export const SELECTION_PAN_DURATION_S = 0.6;
export const SELECTION_PAN_SNAP_EPSILON = 1;
export const MIN_RENDER_ZOOM = 1;
export const CACHE_MAX_ZOOM = 5;
export const COLOR_MAX_ZOOM = 5;
export const RING_EXTENT_FINEST_MULTIPLIER = 2.88;
export const RING_EXTENT_COARSER_MULTIPLIER = 3.88;
export const ALTITUDE_CAP_MIN = 500;
export const ALTITUDE_CAP_FULL = 25000;
export const LOOK_UP_ANGLE_FAR_DEG = 60;
export const LOOK_UP_ANGLE_NEAR_DEG = 90;
export const SKIRT_DROP = 400;
export const OCEAN_QUAD_SIZE = 200000;
export const TILE_UPDATE_INTERVAL_MS = 150;
export const RESIZE_DEBOUNCE_MS = 100;

/** How a POI dot renders - maps directly from the OL map's circle style. */
export interface PoiDotStyle {
  /** Dot fill color. */
  fill: string;
  /** Dot outline color. */
  stroke: string;
  /** Dot diameter in CSS px (OL circle radius * 2). */
  diameterPx: number;
  /** Outline thickness in CSS px (OL circle-stroke-width). */
  strokeWidth?: number;
}

/** Label styling for a POI type, matching OL's label styles:
 * - sizeCss: on-screen text height in px (OL font: 0.5rem=8, 0.6rem=10, 0.75rem=12)
 */
export interface PoiLabelConfig {
  sizeCss: number;
}

/** Everything a POI type renders with - the single source of truth for the 3D map. */
export interface PoiTypeConfig {
  dot: PoiDotStyle;
  label: PoiLabelConfig;
}

/** olRadius * 2 - OL's circle-radius is a CSS px radius. */
const dotSize = (olRadius: number) => olRadius * 2;

export const POI_CONFIG: Record<number, PoiTypeConfig> = {
  // Delivery - no text label in OL
  0: {
    dot: { fill: colorYellow500, stroke: colorYellow950, diameterPx: dotSize(6) },
    label: { sizeCss: 0 },
  },
  // House - 600 0.6rem, offset -12
  1: {
    dot: { fill: colorCyan500, stroke: colorCyan950, diameterPx: dotSize(6) },
    label: { sizeCss: 10 },
  },
  // Player - 600 0.75rem, offset -12
  2: {
    dot: { fill: colorEmerald400, stroke: colorEmerald950, diameterPx: dotSize(4) },
    label: { sizeCss: 12 },
  },
  // Pin - 600 0.75rem, offset -14
  3: {
    dot: { fill: colorRed400, stroke: colorRed950, diameterPx: dotSize(5) },
    label: { sizeCss: 12 },
  },
  // Teleport - 600 0.5rem, offset -12
  4: {
    dot: { fill: colorViolet400, stroke: colorViolet950, diameterPx: dotSize(5) },
    label: { sizeCss: 8 },
  },
};

/** Delivery-point variants, mirroring the OL delivery layer:
 * - RESIDENT: amber, one radius smaller (min zoom 5)
 * - JOB_SOURCE (jobs=1): orange fill, green stroke, thicker outline
 * - JOB_DEST (jobs=2): orange fill, blue stroke, thicker outline */
export const POI_DELIVERY_RESIDENT: PoiDotStyle = {
  fill: colorAmber300,
  stroke: colorAmber950,
  diameterPx: dotSize(5),
};
export const POI_DELIVERY_JOB_SOURCE: PoiDotStyle = {
  fill: colorOrange500,
  stroke: colorGreen600,
  diameterPx: dotSize(6),
  strokeWidth: 1,
};
export const POI_DELIVERY_JOB_DEST: PoiDotStyle = {
  fill: colorOrange500,
  stroke: colorBlue600,
  diameterPx: dotSize(6),
  strokeWidth: 1,
};
