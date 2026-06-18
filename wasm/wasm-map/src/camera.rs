use bevy::camera::ScalingMode;
use bevy::input::mouse::MouseWheel;
use bevy::input::touch::Touches;
use bevy::prelude::*;
use bevy::window::{PrimaryWindow, RequestRedraw};

use crate::components::{DragState, MapCamera};
use crate::constants::{MAP_SIZE, MAX_ZOOM, MIN_ZOOM, SMOOTH_SPEED, ZOOM_SPEED};

pub(crate) fn setup(mut commands: Commands) {
    commands.spawn((
        Camera2d,
        MapCamera {
            pos: Vec2::new(MAP_SIZE / 2.0, -MAP_SIZE / 2.0),
            target_pos: Vec2::new(MAP_SIZE / 2.0, -MAP_SIZE / 2.0),
            zoom: MIN_ZOOM,
            target_zoom: MIN_ZOOM,
        },
    ));
}

pub(crate) fn handle_input(
    mouse_button: Res<ButtonInput<MouseButton>>,
    mut scroll_events: MessageReader<MouseWheel>,
    mut camera_query: Query<&mut MapCamera>,
    windows: Query<&Window, With<PrimaryWindow>>,
    mut drag_state: ResMut<DragState>,
    touches: Res<Touches>,
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

    // Touch input: collect active touches
    let touch_list: Vec<_> = touches.iter().collect();
    match touch_list.len() {
        1 => {
            // Single-finger pan
            drag_state.pinch_distance = None;
            drag_state.pinch_center = None;

            let pos = touch_list[0].position();
            if let Some(last_pos) = drag_state.touch_last_pos {
                let delta_px = pos - last_pos;
                let visible = MAP_SIZE / 2f32.powf(camera.target_zoom);
                let world_per_px = visible / window.width().min(window.height());
                camera.target_pos +=
                    Vec2::new(-delta_px.x * world_per_px, delta_px.y * world_per_px);
            }
            drag_state.touch_last_pos = Some(pos);
        }
        2 => {
            // Two-finger pinch zoom + pan
            drag_state.touch_last_pos = None;

            let pos_a = touch_list[0].position();
            let pos_b = touch_list[1].position();
            let center = (pos_a + pos_b) / 2.0;
            let distance = pos_a.distance(pos_b);

            if let Some(last_distance) = drag_state.pinch_distance {
                if last_distance > 1.0 && distance > 1.0 {
                    let zoom_delta = (distance / last_distance).log2();
                    let new_zoom = (camera.target_zoom + zoom_delta).clamp(MIN_ZOOM, MAX_ZOOM);

                    // Keep the pinch midpoint fixed in world space
                    let aspect = window.width() / window.height();
                    let visible_h = MAP_SIZE / 2f32.powf(camera.target_zoom);
                    let visible_w = visible_h * aspect;
                    let ndc_x = (center.x / window.width()) * 2.0 - 1.0;
                    let ndc_y = 1.0 - (center.y / window.height()) * 2.0;
                    let world_x = camera.target_pos.x + ndc_x * visible_w / 2.0;
                    let world_y = camera.target_pos.y + ndc_y * visible_h / 2.0;
                    let new_visible_h = MAP_SIZE / 2f32.powf(new_zoom);
                    let new_visible_w = new_visible_h * aspect;
                    camera.target_pos.x = world_x - ndc_x * new_visible_w / 2.0;
                    camera.target_pos.y = world_y - ndc_y * new_visible_h / 2.0;

                    camera.target_zoom = new_zoom;
                }
            }
            drag_state.pinch_distance = Some(distance);

            // Pan based on midpoint movement
            if let Some(last_center) = drag_state.pinch_center {
                let delta_px = center - last_center;
                let visible = MAP_SIZE / 2f32.powf(camera.target_zoom);
                let world_per_px = visible / window.width().min(window.height());
                camera.target_pos +=
                    Vec2::new(-delta_px.x * world_per_px, delta_px.y * world_per_px);
            }
            drag_state.pinch_center = Some(center);
        }
        _ => {
            drag_state.touch_last_pos = None;
            drag_state.pinch_distance = None;
            drag_state.pinch_center = None;
        }
    }

    for event in scroll_events.read() {
        let zoom_delta = event.y * ZOOM_SPEED;
        let new_zoom = (camera.target_zoom + zoom_delta).clamp(MIN_ZOOM, MAX_ZOOM);

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

pub(crate) fn update_camera(
    time: Res<Time>,
    windows: Query<&Window, With<PrimaryWindow>>,
    mut camera_query: Query<(&mut MapCamera, &mut Transform, &mut Projection)>,
    mut redraw: MessageWriter<RequestRedraw>,
) {
    let dt = time.delta_secs();
    let smooth = 1.0 - (-SMOOTH_SPEED * dt).exp();
    let Ok(window) = windows.single() else {
        return;
    };

    let mut still_animating = false;

    for (mut camera, mut transform, mut projection) in camera_query.iter_mut() {
        camera.pos = camera.pos.lerp(camera.target_pos, smooth);
        camera.zoom += (camera.target_zoom - camera.zoom) * smooth;

        if (camera.target_pos - camera.pos).length_squared() > 0.01
            || (camera.target_zoom - camera.zoom).abs() > 0.0001
        {
            still_animating = true;
        }

        transform.translation = camera.pos.extend(0.0);

        let aspect = window.width() / window.height();
        let visible_h = MAP_SIZE / 2f32.powf(camera.zoom);
        let visible_w = visible_h * aspect;

        if let Projection::Orthographic(ref mut ortho) = *projection {
            ortho.scaling_mode = ScalingMode::Fixed {
                width: visible_w,
                height: visible_h,
            };
        }
    }

    if still_animating {
        redraw.write(RequestRedraw);
    }

}
