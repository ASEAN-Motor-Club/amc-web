use bevy::prelude::*;
use bevy::window::PrimaryWindow;

#[cfg(debug_assertions)]
use crate::components::{DebugOverlay, ShowDebugTiles};
use crate::components::{MapCamera, TileMarker, TileZoom};
use crate::constants::{MAP_SIZE, MAX_TILE_ZOOM, TILE_PX};

fn map_to_world(mx: f32, my: f32) -> Vec2 {
    Vec2::new(mx - MAP_SIZE / 2.0, MAP_SIZE / 2.0 - my)
}

fn tile_size_at_zoom(z: i32) -> f32 {
    MAP_SIZE / (1 << z) as f32
}

pub(crate) fn update_tiles(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    camera_query: Query<&MapCamera>,
    tile_query: Query<(Entity, &TileMarker)>,
    windows: Query<&Window, With<PrimaryWindow>>,
    #[cfg(debug_assertions)] mut tile_zoom: ResMut<TileZoom>,
    #[cfg(debug_assertions)] show_debug: Res<ShowDebugTiles>,
) {
    let Ok(camera) = camera_query.single() else {
        return;
    };
    let Ok(window) = windows.single() else {
        return;
    };

    // Pick tile z so that one tile occupies ~TILE_PX screen pixels:
    let z = (camera.zoom + (window.height() / TILE_PX).log2())
        .round()
        .clamp(0.0, MAX_TILE_ZOOM as f32) as i32;
    let tile_size = tile_size_at_zoom(z);
    let tiles_at_z = 1 << z;

    #[cfg(debug_assertions)]
    {
        tile_zoom.0 = z;
    }

    let visible_h = MAP_SIZE / 2f32.powf(camera.zoom);
    let visible_w = visible_h * (window.width() / window.height());

    let cam_map_x = camera.pos.x + MAP_SIZE / 2.0;
    let cam_map_y = MAP_SIZE / 2.0 - camera.pos.y;

    let x_min = ((cam_map_x - visible_w / 2.0) / tile_size).floor() as i32 - 1;
    let x_max = ((cam_map_x + visible_w / 2.0) / tile_size).ceil() as i32 + 1;
    let y_min = ((cam_map_y - visible_h / 2.0) / tile_size).floor() as i32 - 1;
    let y_max = ((cam_map_y + visible_h / 2.0) / tile_size).ceil() as i32 + 1;

    let x_min = x_min.max(0);
    let x_max = x_max.min(tiles_at_z);
    let y_min = y_min.max(0);
    let y_max = y_max.min(tiles_at_z);

    for (entity, tile) in tile_query.iter() {
        if tile.z != z || !(x_min..x_max).contains(&tile.x) || !(y_min..y_max).contains(&tile.y) {
            commands.entity(entity).despawn();
        }
    }

    for tx in x_min..x_max {
        for ty in y_min..y_max {
            if tile_query
                .iter()
                .any(|(_, t)| t.z == z && t.x == tx && t.y == ty)
            {
                continue;
            }

            let path = format!("map/{}_{}_{}.png", z, tx, ty);
            let ts = tile_size_at_zoom(z);
            let map_cx = tx as f32 * ts + ts / 2.0;
            let map_cy = ty as f32 * ts + ts / 2.0;
            let world_pos = map_to_world(map_cx, map_cy);

            let mut tile = commands.spawn((
                Sprite {
                    image: asset_server.load::<Image>(&path),
                    custom_size: Some(Vec2::splat(ts)),
                    ..Default::default()
                },
                Transform::from_translation(world_pos.extend(0.0)),
                TileMarker { z, x: tx, y: ty },
            ));

            #[cfg(debug_assertions)]
            {
                let vis = if show_debug.0 {
                    Visibility::Visible
                } else {
                    Visibility::Hidden
                };
                tile.with_children(|p| {
                    p.spawn((
                        Sprite {
                            color: Color::BLACK,
                            custom_size: Some(Vec2::splat(ts)),
                            ..Default::default()
                        },
                        Transform::from_translation(Vec3::Z * 0.01),
                        DebugOverlay,
                        vis,
                    ));
                    p.spawn((
                        Sprite {
                            color: Color::WHITE,
                            custom_size: Some(Vec2::splat(ts * 0.98)),
                            ..Default::default()
                        },
                        Transform::from_translation(Vec3::Z * 0.02),
                        DebugOverlay,
                        vis,
                    ));
                });
            }
        }
    }
}
