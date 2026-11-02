/** Every tunable of the house viewer; scene.ts holds no bare numbers. Lengths in meters. */

/** Plot slab thickness under the grass. */
export const PLOT_THICKNESS_M = 0.3;
/** Pushes the plot top behind coplanar floors/decals (house floor, parking paint) in depth. */
export const PLOT_POLYGON_OFFSET = 4;
/** Extra reach around each building's origin when framing the scene (furniture extents). */
export const BUILDING_REACH_M = 1.5;
/** Framing radius = farthest content × this. */
export const FRAME_PADDING_FACTOR = 1.05;

export const COLOR_GRASS = 0x7fa35b;
/** Plot ground: meters of plot covered by one repeat of the landscape grass texture. The
 * landscape material's own tiling is baked into its graph; matched by eye to in-game grass. */
export const GROUND_TILE_M = 4;
export const COLOR_SKY_LIGHT = 0xdfefff;
export const COLOR_GROUND_LIGHT = 0x6b5a45;
export const COLOR_SUN = 0xfff1dc;

export const HEMISPHERE_INTENSITY = 0.5;
export const SUN_INTENSITY = 2.2;
export const ENVIRONMENT_INTENSITY = 0.25;
export const SHADOW_MAP_SIZE = 4096;
/** Pushes shadow lookups off the surface along its normal: kills acne on the flat plot and walls. */
export const SHADOW_NORMAL_BIAS = 0.03;
/** Sun distance from the plot centre, in framing radii (only direction matters for a directional
 * light; this keeps the shadow camera's near/far around the scene). */
export const SUN_DISTANCE_FACTOR = 3;

export const CAMERA_FOV_DEG = 40;
export const CAMERA_NEAR_M = 0.1;
/** Initial orbit distance and the zoom limits, as multiples of the framing radius. */
export const CAMERA_DISTANCE_FACTOR = 2.6;
export const CAMERA_MIN_DISTANCE_FACTOR = 0.3;
export const CAMERA_MAX_DISTANCE_FACTOR = 5;
export const CAMERA_FAR_FACTOR = 20;
/** Initial polar angle (0 = straight down). */
export const CAMERA_POLAR_DEG = 58;
/** Never orbit below the plot. */
export const CAMERA_MAX_POLAR_RAD = Math.PI * 0.47;
/** Every plot gets one of these at its road edge; its heading is the plot's front. */
export const MAILBOX_BUILDING_KEY = 'MailBox_01';
/** OrbitControls units: 2 ≈ one revolution per 30 s. */
export const AUTO_ROTATE_SPEED = 1.2;
export const ORBIT_DAMPING = 0.08;
/** Frame deltas above this (tab switch, breakpoint) are clamped. */
export const MAX_FRAME_DELTA_S = 0.1;
