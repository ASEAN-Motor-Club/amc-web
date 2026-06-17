use bevy::prelude::*;

#[derive(Component)]
pub(crate) struct MapCamera {
    pub(crate) pos: Vec2,
    pub(crate) target_pos: Vec2,
    pub(crate) zoom: f32,
    pub(crate) target_zoom: f32,
}

#[derive(Component)]
pub(crate) struct TileMarker {
    pub(crate) z: i32,
    pub(crate) x: i32,
    pub(crate) y: i32,
}

#[derive(Component)]
pub(crate) struct TileFadeIn(pub(crate) f32);

#[derive(Component)]
pub(crate) struct TileFadeOut(pub(crate) f32);

#[derive(Resource, Default)]
pub(crate) struct DragState {
    pub(crate) dragging: bool,
    pub(crate) last_pos: Option<Vec2>,
}

#[derive(Component)]
pub(crate) struct ZoomText;

#[derive(Resource, Default)]
pub(crate) struct TileZoom(pub(crate) i32);
