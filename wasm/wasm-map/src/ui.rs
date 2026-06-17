use bevy::prelude::*;

use crate::components::{MapCamera, TileZoom, ZoomText};

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

pub(crate) fn update_zoom_text(
    camera_query: Query<&MapCamera>,
    mut text_query: Query<&mut Text, With<ZoomText>>,
    tile_zoom: Res<TileZoom>,
) {
    if let Ok(camera) = camera_query.single() {
        if let Ok(mut text) = text_query.single_mut() {
            text.0 = format!("Zoom: {:.2}  Tile: {}", camera.zoom, tile_zoom.0);
        }
    }
}
