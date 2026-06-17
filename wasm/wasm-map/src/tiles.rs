use bevy::prelude::*;
use bevy::window::PrimaryWindow;
use std::collections::HashSet;

use crate::components::{MapCamera, TileFadeIn, TileFadeOut, TileMarker, TileZoom};
use crate::constants::{FADE_IN_DURATION, FADE_OUT_DURATION, MAP_SIZE, MAX_ZOOM, TILE_PX};

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
    fade_in_query: Query<Entity, With<TileFadeIn>>,
    fade_out_query: Query<Entity, With<TileFadeOut>>,
    windows: Query<&Window, With<PrimaryWindow>>,
    mut tile_zoom: ResMut<TileZoom>,
) {
    let Ok(camera) = camera_query.single() else {
        return;
    };
    let Ok(window) = windows.single() else {
        return;
    };

    // Pick tile z so that one tile occupies ~TILE_PX screen pixels:
    // tile_screen_px = screen_height * 2^(cam_zoom - z) = TILE_PX
    // → z = cam_zoom + log2(screen_height / TILE_PX)
    let z = (camera.zoom + (window.height() / TILE_PX).log2())
        .round()
        .clamp(0.0, MAX_ZOOM as f32) as i32;
    tile_zoom.0 = z;
    let tile_size = tile_size_at_zoom(z);
    let tiles_at_z = 1 << z;

    let aspect = 1.0f32;
    let visible_h = MAP_SIZE / 2f32.powf(camera.zoom);
    let visible_w = visible_h * aspect;

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

    let mut needed: HashSet<(i32, i32, i32)> = HashSet::new();
    for x in x_min..x_max {
        for y in y_min..y_max {
            needed.insert((z, x, y));
        }
    }

    for (entity, tile) in tile_query.iter() {
        let should_keep = tile.z == z && needed.contains(&(tile.z, tile.x, tile.y));
        if !should_keep && !fade_out_query.contains(entity) {
            if fade_in_query.contains(entity) {
                commands.entity(entity).remove::<TileFadeIn>();
            }
            commands.entity(entity).insert(TileFadeOut(FADE_OUT_DURATION));
        }
    }

    for &(tz, tx, ty) in &needed {
        let already_exists = tile_query
            .iter()
            .any(|(_, t)| t.z == tz && t.x == tx && t.y == ty);
        if already_exists {
            continue;
        }

        let path = format!("map/{}_{}_{}.png", tz, tx, ty);
        let ts = tile_size_at_zoom(tz);
        let map_cx = tx as f32 * ts + ts / 2.0;
        let map_cy = ty as f32 * ts + ts / 2.0;
        let world_pos = map_to_world(map_cx, map_cy);

        commands.spawn((
            Sprite {
                image: asset_server.load(&path),
                custom_size: Some(Vec2::splat(ts)),
                color: Color::srgba(1.0, 1.0, 1.0, 0.0),
                ..Default::default()
            },
            Transform::from_translation(world_pos.extend(0.0)),
            TileMarker {
                z: tz,
                x: tx,
                y: ty,
            },
            TileFadeIn(FADE_IN_DURATION),
        ));
    }
}

pub(crate) fn update_fade(
    mut commands: Commands,
    time: Res<Time>,
    mut fade_in_query: Query<(Entity, &mut TileFadeIn, &mut Sprite), Without<TileFadeOut>>,
    mut fade_out_query: Query<(Entity, &mut TileFadeOut, &mut Sprite), Without<TileFadeIn>>,
) {
    let dt = time.delta_secs();

    let mut fade_in_done = Vec::new();
    for (entity, mut fade, mut sprite) in fade_in_query.iter_mut() {
        fade.0 -= dt;
        let alpha = (1.0 - fade.0 / FADE_IN_DURATION).clamp(0.0, 1.0);
        sprite.color = Color::srgba(1.0, 1.0, 1.0, alpha);
        if fade.0 <= 0.0 {
            sprite.color = Color::srgba(1.0, 1.0, 1.0, 1.0);
            fade_in_done.push(entity);
        }
    }
    for entity in fade_in_done {
        if let Ok(mut e) = commands.get_entity(entity) {
            e.remove::<TileFadeIn>();
        }
    }

    let mut fade_out_done = Vec::new();
    for (entity, mut fade, mut sprite) in fade_out_query.iter_mut() {
        fade.0 -= dt;
        let alpha = (fade.0 / FADE_OUT_DURATION).clamp(0.0, 1.0);
        sprite.color = Color::srgba(1.0, 1.0, 1.0, alpha);
        if fade.0 <= 0.0 {
            fade_out_done.push(entity);
        }
    }
    for entity in fade_out_done {
        if let Ok(mut e) = commands.get_entity(entity) {
            e.despawn();
        }
    }
}
