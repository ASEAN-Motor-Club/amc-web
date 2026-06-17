use bevy::asset::AssetMetaCheck;
use bevy::input::mouse::MouseWheel;
use bevy::prelude::*;
use bevy::render::camera::ScalingMode;
use bevy::window::PrimaryWindow;
use std::collections::HashSet;
use wasm_bindgen::prelude::*;

const TILE_PX: f32 = 256.0;
const MAX_ZOOM: i32 = 4;
const MAP_TILES_AT_MAX: f32 = (1 << MAX_ZOOM) as f32;
const MAP_SIZE: f32 = TILE_PX * MAP_TILES_AT_MAX;
const FADE_IN_DURATION: f32 = 0.3;
const FADE_OUT_DURATION: f32 = 0.2;
const ZOOM_SPEED: f32 = 0.15;
const SMOOTH_SPEED: f32 = 8.0;

#[derive(Component)]
struct MapCamera {
    pos: Vec2,
    target_pos: Vec2,
    zoom: f32,
    target_zoom: f32,
}

#[derive(Component)]
struct TileMarker {
    z: i32,
    x: i32,
    y: i32,
}

#[derive(Component)]
struct TileFadeIn(f32);

#[derive(Component)]
struct TileFadeOut(f32);

#[derive(Resource, Default)]
struct DragState {
    dragging: bool,
    last_pos: Option<Vec2>,
}

#[derive(Component)]
struct ZoomText;

fn map_to_world(mx: f32, my: f32) -> Vec2 {
    Vec2::new(mx - MAP_SIZE / 2.0, MAP_SIZE / 2.0 - my)
}

fn tile_size_at_zoom(z: i32) -> f32 {
    MAP_SIZE / (1 << z) as f32
}

#[wasm_bindgen]
pub fn init(canvas_selector: String) {
    App::new()
        .add_plugins(
            DefaultPlugins
                .build()
                .set(WindowPlugin {
                    primary_window: Some(Window {
                        canvas: Some(canvas_selector),
                        fit_canvas_to_parent: true,
                        ..Default::default()
                    }),
                    ..Default::default()
                })
                .set(AssetPlugin {
                    meta_check: AssetMetaCheck::Never,
                    ..Default::default()
                }),
        )
        .init_resource::<DragState>()
        .add_systems(Startup, (setup, setup_zoom_ui))
        .add_systems(
            Update,
            (handle_input, update_camera, update_tiles, update_fade, update_zoom_text).chain(),
        )
        .run();
}

fn setup(mut commands: Commands) {
    commands.spawn((
        Camera2d,
        MapCamera {
            pos: Vec2::new(MAP_SIZE / 2.0, -MAP_SIZE / 2.0),
            target_pos: Vec2::new(MAP_SIZE / 2.0, -MAP_SIZE / 2.0),
            zoom: 0.0,
            target_zoom: 0.0,
        },
    ));
}

fn setup_zoom_ui(mut commands: Commands) {
    commands
        .spawn((
            Node {
                position_type: PositionType::Absolute,
                top: Val::Px(12.0),
                left: Val::Px(12.0),
                ..default()
            },
            BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.5)),
            BorderRadius::all(Val::Px(6.0)),
            Padding::axes(Val::Px(8.0), Val::Px(4.0)),
        ))
        .with_children(|parent| {
            parent.spawn((Text::new("Zoom: 0.00"), ZoomText));
        });
}

fn update_zoom_text(
    camera_query: Query<&MapCamera>,
    mut text_query: Query<&mut Text, With<ZoomText>>,
) {
    if let Ok(camera) = camera_query.single() {
        if let Ok(mut text) = text_query.single_mut() {
            text.0 = format!("Zoom: {:.2}", camera.zoom);
        }
    }
}

fn handle_input(
    mouse_button: Res<ButtonInput<MouseButton>>,
    mut scroll_events: EventReader<MouseWheel>,
    mut camera_query: Query<&mut MapCamera>,
    windows: Query<&Window, With<PrimaryWindow>>,
    mut drag_state: ResMut<DragState>,
) {
    let Ok(mut camera) = camera_query.single_mut() else {
        return;
    };
    let Ok(window) = windows.single() else {
        return;
    };

    if mouse_button.just_pressed(MouseButton::Left) {
        drag_state.dragging = true;
        drag_state.last_pos = window.cursor_position();
    }
    if mouse_button.just_released(MouseButton::Left) {
        drag_state.dragging = false;
        drag_state.last_pos = None;
    }

    if drag_state.dragging {
        if let Some(cursor_pos) = window.cursor_position() {
            if let Some(last_pos) = drag_state.last_pos {
                let delta_px = cursor_pos - last_pos;
                let visible = MAP_SIZE / 2f32.powf(camera.zoom);
                let world_per_px = visible / window.width().min(window.height());
                let delta_world = Vec2::new(-delta_px.x * world_per_px, delta_px.y * world_per_px);
                camera.target_pos += delta_world;
            }
            drag_state.last_pos = Some(cursor_pos);
        }
    }

    for event in scroll_events.read() {
        let zoom_delta = -event.y * ZOOM_SPEED;
        let new_zoom = (camera.target_zoom + zoom_delta).clamp(0.0, MAX_ZOOM as f32);

        if let Some(cursor_pos) = window.cursor_position() {
            let aspect = window.width() / window.height();
            let visible_h = MAP_SIZE / 2f32.powf(camera.target_zoom);
            let visible_w = visible_h * aspect;

            let ndc_x = (cursor_pos.x / window.width()) * 2.0 - 1.0;
            let ndc_y = 1.0 - (cursor_pos.y / window.height()) * 2.0;

            let world_x = camera.target_pos.x + ndc_x * visible_w / 2.0;
            let world_y = camera.target_pos.y + ndc_y * visible_h / 2.0;

            let new_visible_h = MAP_SIZE / 2f32.powf(new_zoom);
            let new_visible_w = new_visible_h * aspect;

            camera.target_pos.x = world_x - ndc_x * new_visible_w / 2.0;
            camera.target_pos.y = world_y - ndc_y * new_visible_h / 2.0;
        }

        camera.target_zoom = new_zoom;
    }

    let visible = MAP_SIZE / 2f32.powf(camera.target_zoom);
    let half_vis_x = visible * (window.width() / window.height()).min(1.0) / 2.0;
    let half_vis_y = visible / 2.0;
    let clamp_x = MAP_SIZE / 2.0 - half_vis_x;
    let clamp_y = MAP_SIZE / 2.0 - half_vis_y;
    if clamp_x > 0.0 {
        camera.target_pos.x = camera.target_pos.x.clamp(-clamp_x, clamp_x);
    } else {
        camera.target_pos.x = 0.0;
    }
    if clamp_y > 0.0 {
        camera.target_pos.y = camera.target_pos.y.clamp(-clamp_y, clamp_y);
    } else {
        camera.target_pos.y = 0.0;
    }
}

fn update_camera(
    time: Res<Time>,
    windows: Query<&Window, With<PrimaryWindow>>,
    mut camera_query: Query<(&mut MapCamera, &mut Transform, &mut OrthographicProjection)>,
) {
    let dt = time.delta_secs();
    let smooth = 1.0 - (-SMOOTH_SPEED * dt).exp();
    let Ok(window) = windows.single() else {
        return;
    };

    for (mut camera, mut transform, mut projection) in camera_query.iter_mut() {
        camera.pos = camera.pos.lerp(camera.target_pos, smooth);
        camera.zoom += (camera.target_zoom - camera.zoom) * smooth;

        transform.translation = camera.pos.extend(0.0);

        let aspect = window.width() / window.height();
        let visible_h = MAP_SIZE / 2f32.powf(camera.zoom);
        let visible_w = visible_h * aspect;

        projection.scaling_mode = ScalingMode::Fixed {
            width: visible_w,
            height: visible_h,
        };
    }
}

fn update_tiles(
    mut commands: Commands,
    asset_server: Res<AssetServer>,
    camera_query: Query<&MapCamera>,
    tile_query: Query<(Entity, &TileMarker)>,
    fade_in_query: Query<Entity, With<TileFadeIn>>,
    fade_out_query: Query<Entity, With<TileFadeOut>>,
) {
    let Ok(camera) = camera_query.single() else {
        return;
    };

    let z = (camera.zoom.round() as i32).clamp(0, MAX_ZOOM);
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

fn update_fade(
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
        if let Some(mut e) = commands.get_entity(entity) {
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
        if let Some(mut e) = commands.get_entity(entity) {
            e.despawn();
        }
    }
}
