use bevy::prelude::*;
use bevy::window::{PrimaryWindow, RequestRedraw};

use crate::components::{DebugOverlay, MapCamera, ShowDebugTiles, TileZoom, ZoomText};

pub(crate) fn setup_zoom_ui(mut commands: Commands) {
    commands
        .spawn((
            Node {
                position_type: PositionType::Absolute,
                top: Val::Px(12.0),
                left: Val::Px(12.0),
                padding: UiRect::axes(Val::Px(8.0), Val::Px(4.0)),
                border_radius: BorderRadius::all(Val::Px(6.0)),
                ..default()
            },
            BackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.5)),
        ))
        .with_children(|parent| {
            parent.spawn((Text::new("Zoom: 0.00"), ZoomText));
        });
}

pub(crate) fn toggle_debug_tiles(
    keyboard: Res<ButtonInput<KeyCode>>,
    mut show_debug: ResMut<ShowDebugTiles>,
    mut overlay_query: Query<&mut Visibility, With<DebugOverlay>>,
    mut redraw: MessageWriter<RequestRedraw>,
) {
    if !keyboard.just_pressed(KeyCode::KeyD) {
        return;
    }
    show_debug.0 = !show_debug.0;
    let vis = if show_debug.0 {
        Visibility::Visible
    } else {
        Visibility::Hidden
    };
    for mut v in overlay_query.iter_mut() {
        *v = vis;
    }
    redraw.write(RequestRedraw);
}

pub(crate) fn update_zoom_text(
    camera_query: Query<&MapCamera>,
    mut text_query: Query<&mut Text, With<ZoomText>>,
    tile_zoom: Res<TileZoom>,
    windows: Query<&Window, With<PrimaryWindow>>,
    time: Res<Time>,
) {
    let Ok(camera) = camera_query.single() else {
        return;
    };
    let Ok(mut text) = text_query.single_mut() else {
        return;
    };
    let Ok(window) = windows.single() else { return };

    let tile_px = window.height() * 2f32.powf(camera.zoom) / (1 << tile_zoom.0) as f32;
    let fps = 1.0 / time.delta_secs();
    text.0 = format!(
        "FPS: {fps:.0}  Zoom: {:.2}  Tile: {}  ({:.0}px)",
        camera.zoom, tile_zoom.0, tile_px
    );
}
