use bevy::asset::AssetMetaCheck;
use bevy::camera_controller::pan_camera::{PanCamera, PanCameraPlugin};
use bevy::prelude::*;
use wasm_bindgen::prelude::*;

#[derive(Component)]
struct ZoomText;

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
        .add_plugins(PanCameraPlugin)
        .add_systems(Startup, setup)
        .add_systems(Startup, setup_zoom_ui)
        .add_systems(Update, update_zoom_text)
        .run();
}

fn setup_zoom_ui(mut commands: Commands) {
    commands
        .spawn((Node {
            position_type: PositionType::Absolute,
            top: Val::Px(12.0),
            left: Val::Px(12.0),
            ..default()
        },))
        .with_children(|parent| {
            parent.spawn((Text::new("Zoom: 1.0"), ZoomText));
        });
}

fn update_zoom_text(
    camera_query: Query<&PanCamera>,
    mut text_query: Query<&mut Text, With<ZoomText>>,
) {
    if let Ok(camera) = camera_query.single() {
        if let Ok(mut text) = text_query.single_mut() {
            text.0 = format!("{:.2}", camera.zoom_factor);
        }
    }
}

fn setup(mut commands: Commands, asset_server: Res<AssetServer>) {
    commands.spawn((
        Camera2d,
        PanCamera {
            zoom_speed: 0.01,
            pan_speed: 500.,
            ..Default::default()
        },
    ));

    commands.spawn(Sprite::from_image(asset_server.load("map/0_0_0.png")));
}
