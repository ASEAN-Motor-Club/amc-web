mod camera;
mod components;
mod constants;
mod features;
mod tiles;
#[cfg(debug_assertions)]
mod debug_ui;

use bevy::asset::AssetMetaCheck;
use bevy::prelude::*;
use bevy::winit::WinitSettings;
use wasm_bindgen::prelude::*;

use components::DragState;
use features::{FeaturePoint, LayerStyle};
#[cfg(debug_assertions)]
use components::{ShowDebugTiles, TileZoom};

/// Define or redefine a layer's visual style.
/// Call this before or after `set_layer_features` — the layer renders once both are set.
#[wasm_bindgen]
pub fn create_layer(
    id: u32,
    size: f32,
    stroke_size: f32,
    label_size: f32,
    color: String,
) {
    features::create_layer(
        id,
        LayerStyle {
            size,
            stroke_size,
            label_size,
            color,
        },
    );
}

/// Convenience constructor for FeaturePoint.
#[wasm_bindgen]
pub fn create_feature_point(x: f32, y: f32, label: String) -> FeaturePoint {
    FeaturePoint { x, y, label }
}

/// Replace all features on a layer. Pass an empty array to clear the layer.
/// Coordinates are in data-space (MAP_REAL_X_LEFT = -1_280_000, MAP_REAL_Y_TOP = -320_000).
#[wasm_bindgen]
pub fn set_layer_features(layer_id: u32, features: Vec<FeaturePoint>) {
    features::set_layer_features(layer_id, features);
}

/// Update a single feature in place by index. No-op if index is out of bounds.
#[wasm_bindgen]
pub fn update_layer_feature_at(layer_id: u32, index: usize, point: FeaturePoint) {
    features::update_layer_feature_at(layer_id, index, point);
}

#[wasm_bindgen]
pub fn init(canvas_selector: String) {
    let mut app = App::new();

    app.add_plugins(
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
    .insert_resource(WinitSettings::desktop_app())
    .init_resource::<DragState>()
    .add_systems(Startup, (camera::setup, features::setup_fonts))
    .add_systems(
        Update,
        (
            camera::handle_input,
            camera::update_camera,
            tiles::update_tiles,
            features::sync_features,
            features::update_dot_scale,
        )
            .chain(),
    );

    #[cfg(debug_assertions)]
    app.init_resource::<ShowDebugTiles>()
        .init_resource::<TileZoom>()
        .add_systems(Startup, debug_ui::setup_zoom_ui)
        .add_systems(Update, (debug_ui::toggle_debug_tiles, debug_ui::update_zoom_text));

    app.run();
}
