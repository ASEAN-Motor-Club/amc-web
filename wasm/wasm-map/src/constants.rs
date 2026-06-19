pub(crate) const TILE_PX: f32 = 256.0;
pub(crate) const MAX_TILE_ZOOM: i32 = 4;
pub(crate) const MAX_ZOOM: f32 = 3.5;
pub(crate) const MAP_SIZE: f32 = TILE_PX * (1 << MAX_TILE_ZOOM) as f32;
pub(crate) const ZOOM_SPEED: f32 = 0.01;
pub(crate) const SMOOTH_SPEED: f32 = 8.0;
pub(crate) const MIN_ZOOM: f32 = -0.5;
