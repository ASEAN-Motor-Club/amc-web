import {
  colorAmber200,
  colorAmber300,
  colorAmber400,
  colorAmber950,
  colorBlue500,
  colorBlue600,
  colorCyan200,
  colorCyan300,
  colorCyan400,
  colorCyan500,
  colorCyan600,
  colorCyan950,
  colorEmerald200,
  colorEmerald400,
  colorEmerald500,
  colorEmerald950,
  colorGray950,
  colorGreen500,
  colorGreen600,
  colorOrange300,
  colorOrange500,
  colorOrange600,
  colorRed200,
  colorRed400,
  colorRed500,
  colorRed950,
  colorViolet200,
  colorViolet400,
  colorViolet950,
  colorWhite,
  colorYellow300,
  colorYellow500,
  colorYellow600,
  colorYellow950,
} from '#lib/tw-var.ts';

/** Perspective camera vertical field of view (deg). */
export const CAMERA_FOV_DEG = 55;
/** Farthest the 3D camera can sit from its target. Far enough to show the whole map at the 2D
 * view's lowest zoom (zoom 0 on a 700 px tall canvas is a ~58 km view), so a 2D -> 3D switch keeps
 * the scale at any zoom the 2D view allows. */
export const PERSPECTIVE_MAX_DISTANCE = 65_000;
/** Distance a fresh 3D scene opens at (the whole map), when no view is carried over. */
export const PERSPECTIVE_START_DISTANCE = 25_000;
/** Rotate speed and the look-up cap lerp from near to far over this distance, then hold. */
export const ROTATION_LERP_DISTANCE = 25_000;
/** Haze towards the sky colour; starts beyond the farthest camera so the map never washes out. */
export const FOG_NEAR = 70_000;
export const FOG_FAR = 200_000;
export const ROTATE_SPEED_NEAR = 0.15;
export const ROTATE_SPEED_FAR = 1.0;
/** Two-finger travel (CSS px) before the 3D gesture commits to tilt or zoom+rotate. */
export const TOUCH_GESTURE_LOCK_PX = 10;
/** Tilt per view-height of two-finger vertical drag (radians). */
export const TOUCH_TILT_RAD_PER_VIEW_HEIGHT = Math.PI;
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

// ---- orthographic (2D) view ----

/** OL's view: opens on the whole map at zoom 1, never zooms in past 8. */
export const ORTHO_INITIAL_ZOOM = 1;
export const ORTHO_MAX_ZOOM = 8;
/** Zoom-button step in the 2D view: one whole zoom level per click, like OL's +/- control. */
export const ORTHO_ZOOM_BUTTON_LOG_STEP = -Math.LN2;
/** The 2D view may pan this many map sizes past each edge (OL's view extent); the void there
 * shows the background colour. */
export const ORTHO_PAN_MARGIN_MAPS = 1;
/** The 2D view shows tiles from this zoom up (OL's tile source `minZoom`); coarser views scale them. */
export const FLAT_MIN_TILE_ZOOM = 2;
/** Flat tiles at or below this zoom stay cached once loaded; finer ones are dropped on unmount
 * (the browser's HTTP cache is the victim cache), bounding GPU memory while panning at depth. */
export const FLAT_CACHE_MAX_ZOOM = 4;
/** The 2D view's background, OL's `bg-[lab(...)]` on the map element - what shows past the map. */
export const ORTHO_BACKGROUND = 'lab(47.888% -2.821 -32.915)';
/** OL's tile layer style `exposure: 0.5, gamma: 1.5`, applied to the tile colours as stored
 * (sRGB bytes): `clamp((exposure + 1) * c, 0, 1)` then `pow(c, 1 / gamma)`. */
export const FLAT_TILE_EXPOSURE = 0.5;
export const FLAT_TILE_GAMMA = 1.5;
/** Flat tiles draw before everything else (they are the ground; nothing depth-tests). */
export const FLAT_TILE_RENDER_ORDER = -10;
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

/**
 * Time of day the 3D map is lit at, as milliseconds since local midnight
 * (1 h = 3 600 000 ms). The sun's azimuth/elevation are derived from it by
 * `motorTownSun()` in `sun.ts`, which reproduces the game's frozen solar arc —
 * change this one number to relight the map.
 *
 * 08:00 = 28 800 000 · 14:00 = 50 400 000 · 16:00 = 57 600 000
 */
export const TIME_OF_DAY_MS = 57_600_000;
export const SUN_DISTANCE = 20000;
export const TILE_UPDATE_INTERVAL_MS = 150;

// ---- track editor overlays (EditorThreeMap) ----

/** Waypoint dots are visible from far away and fade out as the camera closes in, like an
 * in-game waypoint; the gate (semi-transparent face + opaque edges) fades in over the
 * same range (fully drawn inside GATE_FADE_NEAR_M, gone beyond GATE_FADE_FAR_M). */
export const GATE_FADE_NEAR_M = 250;
export const GATE_FADE_FAR_M = 1200;
/** Opacity of the gate box faces at zero distance (the 12-edge frame is opaque). */
export const GATE_FACE_OPACITY = 0.35;
/** X-ray pass (drawn only where terrain/props occlude the gate): the face and edge
 * frame render at these reduced opacities, like the game's see-through players. */
export const GATE_XRAY_FACE_OPACITY = 0.1;
export const GATE_XRAY_EDGE_OPACITY = 0.3;
/** The waypoint connector renders as a flat ribbon this many meters wide (a plain
 * GL line is always 1px). In front of terrain it draws at TRACK_LINE_OPACITY; occluded
 * segments get an x-ray pass at TRACK_LINE_XRAY_OPACITY instead of vanishing. */
export const TRACK_LINE_WIDTH_M = 5;
export const TRACK_LINE_OPACITY = 0.2;
export const TRACK_LINE_XRAY_OPACITY = 0.08;
/** The track editor's 3D view lets you zoom closer than the main map (gates are ~1 m). */
export const TRACK_EDITOR_MIN_DISTANCE_M = 2;
/** Screen-space (CSS px) half-width of the gate pick area, measured across the gate. */
export const TRACK_GATE_PICK_RADIUS_PX = 14;

// ---- ground overlays (area labels) ----

/** Overlay meshes drape this far above the sampled ground so they never z-fight it. */
export const OVERLAY_GROUND_OFFSET_M = 2;

/** Area names appear by hierarchy as the map zooms in: zones always, LargeArea/RaceTrack
 * from cover zoom 3, SmallArea/unnamed only from cover zoom 4 (OL's areaNameTiers). */
export const AREA_NAME_TIERS: { minCoverZ: number; flags: Record<string, boolean> }[] = [
  { minCoverZ: 0, flags: { Zone: true } },
  { minCoverZ: 3, flags: { LargeArea: true, RaceTrack: true } },
  { minCoverZ: 4, flags: { SmallArea: true, '': true } },
];
/** Faint on purpose: the names cover most of the map, they should not compete with POIs. */
export const AREA_NAME_TEXT_OPACITY = 0.6;
export const AREA_NAME_STROKE_OPACITY = 0.4;

// ---- vector overlays (ports of OL's area-bound, shortcut-zone and delivery-line layers) ----

/** Draw order, bottom to top, matching OL's layer array: delivery lines under the dots (1.0+),
 * shortcut zones over them, then labels (2), the picker (2.1), area bounds and area names. */
export const DELIVERY_LINE_RENDER_ORDER = 0.5;
export const SHORTCUT_ZONE_RENDER_ORDER = 1.5;
export const AREA_BOUND_RENDER_ORDER = 2.15;

/** Debug area outlines: translucent fill over a 1px solid outline of the same colour. */
export const AREA_BOUND_FILL_OPACITY = 0.15;
export const AREA_BOUND_STROKE_WIDTH_CSS = 1;

/** Shortcut zones: faint red fill, 2px red dashed outline [4,6], 8px name (0.5rem). */
export const SHORTCUT_ZONE_FILL_OPACITY = 0.12;
export const SHORTCUT_ZONE_STROKE_WIDTH_CSS = 2;
export const SHORTCUT_ZONE_DASH_CSS = { dashCss: 4, gapCss: 6 };
export const SHORTCUT_ZONE_LABEL_SIZE_CSS = 8;

/** Delivery lines: dash geometry and travel speed are screen pixels, so the flow reads the
 * same at any zoom. Lines run origin -> destination and the pattern walks downstream. */
export const DELIVERY_FLOW_DASH_WIDTH = 2;
export const DELIVERY_FLOW_DASH_LENGTH = 6;
export const DELIVERY_FLOW_DASH_GAP = 4;
export const DELIVERY_FLOW_DASH_SPEED = 6;
export const DELIVERY_LINE_OPACITY = 0.75;

/** Per-state color overrides for a dot - OL switches fill (lighter on hover, darker when
 * selected) and stroke (white when selected, except job dots) off the `hover`/`selected`
 * feature attributes. Absent fields fall back to the base dot. */
export interface PoiDotStateOverride {
  fill?: string;
  stroke?: string;
}

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
  /** Hover colors (OL's `hover` attribute switch). */
  hover?: PoiDotStateOverride;
  /** Selected colors (OL's `selected` attribute switch). */
  selected?: PoiDotStateOverride;
}

/** Label styling for a POI type, matching OL's label styles:
 * - sizeCss: on-screen text height in px (OL font: 0.5rem=8, 0.6rem=10, 0.75rem=12)
 */
export interface PoiLabelConfig {
  sizeCss: number;
  /** Distance from the dot to the glyph centre, in px (OL's text `offsetY`, sign dropped). */
  offsetCss: number;
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
    dot: {
      fill: colorYellow500,
      stroke: colorYellow950,
      diameterPx: dotSize(6),
      hover: { fill: colorYellow300 },
      selected: { fill: colorYellow600, stroke: colorWhite },
    },
    label: { sizeCss: 0, offsetCss: 0 },
  },
  // House - 600 0.6rem, offset -12
  1: {
    dot: {
      fill: colorCyan500,
      stroke: colorCyan950,
      diameterPx: dotSize(6),
      hover: { fill: colorCyan300 },
      selected: { fill: colorCyan600, stroke: colorWhite },
    },
    label: { sizeCss: 10, offsetCss: 12 },
  },
  // Player - 600 0.75rem, offset -12
  2: {
    dot: {
      fill: colorEmerald400,
      stroke: colorEmerald950,
      diameterPx: dotSize(4),
      hover: { fill: colorEmerald200 },
      selected: { fill: colorEmerald500, stroke: colorWhite },
    },
    label: { sizeCss: 12, offsetCss: 12 },
  },
  // Pin - 600 0.75rem, offset -14
  3: {
    dot: {
      fill: colorRed400,
      stroke: colorRed950,
      diameterPx: dotSize(5),
      hover: { fill: colorRed200 },
      selected: { fill: colorRed500, stroke: colorWhite },
    },
    label: { sizeCss: 12, offsetCss: 14 },
  },
  // Teleport - 600 0.5rem, offset -12; OL's teleport style has no selected switch
  4: {
    dot: {
      fill: colorViolet400,
      stroke: colorViolet950,
      diameterPx: dotSize(5),
      hover: { fill: colorViolet200 },
    },
    label: { sizeCss: 8, offsetCss: 12 },
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
  hover: { fill: colorAmber200 },
  selected: { fill: colorAmber400, stroke: colorWhite },
};
export const POI_DELIVERY_JOB_SOURCE: PoiDotStyle = {
  fill: colorOrange500,
  stroke: colorGreen600,
  diameterPx: dotSize(6),
  strokeWidth: 2,
  hover: { fill: colorOrange300 },
  selected: { fill: colorOrange600, stroke: colorGreen500 },
};
export const POI_DELIVERY_JOB_DEST: PoiDotStyle = {
  fill: colorOrange500,
  stroke: colorBlue600,
  diameterPx: dotSize(6),
  strokeWidth: 2,
  hover: { fill: colorOrange300 },
  selected: { fill: colorOrange600, stroke: colorBlue500 },
};

/** The coordinate picker's pointer: a white dot that reads on any map colour (OL's `pickLayer`
 * circle: radius 6, 2px dark stroke, zIndex 10 - above dots and POI labels). */
export const POI_PICK_MARKER: PoiDotStyle = {
  fill: colorWhite,
  stroke: colorGray950,
  diameterPx: dotSize(6),
  strokeWidth: 2,
};
export const PICK_MARKER_RENDER_ORDER = 2.1;
/** Area names draw above the picker, like OL's layer order (picker, bounds, then area names). */
export const AREA_LABEL_RENDER_ORDER = 2.2;

/** Vacant house variant, mirroring the OL house layer's `vacant` switch (the POI menu's
 * vacant-only dot color). */
export const POI_HOUSE_VACANT: PoiDotStyle = {
  fill: colorCyan300,
  stroke: colorCyan950,
  diameterPx: dotSize(6),
  hover: { fill: colorCyan200 },
  selected: { fill: colorCyan400, stroke: colorWhite },
};

/** House whose depot is nearly out of stock - the OL house layer's red outline
 * (`severe` attribute) at the same thickness. */
export const POI_HOUSE_SEVERE: PoiDotStyle = {
  fill: colorCyan500,
  stroke: colorRed500,
  diameterPx: dotSize(6),
  strokeWidth: 2,
  hover: { fill: colorCyan300 },
  selected: { fill: colorCyan600, stroke: colorWhite },
};
