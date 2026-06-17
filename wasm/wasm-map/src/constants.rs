pub(crate) const TILE_PX: f32 = 256.0;
pub(crate) const MAX_ZOOM: i32 = 4;
pub(crate) const MAP_SIZE: f32 = TILE_PX * (1 << MAX_ZOOM) as f32;
pub(crate) const FADE_IN_DURATION: f32 = 0.3;
pub(crate) const FADE_OUT_DURATION: f32 = 0.2;
pub(crate) const ZOOM_SPEED: f32 = 0.003;
pub(crate) const SMOOTH_SPEED: f32 = 8.0;
pub(crate) const MIN_ZOOM: f32 = -0.5;
