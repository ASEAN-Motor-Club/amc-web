mod camera;
mod components;
mod constants;
mod tiles;
mod ui;

use bevy::asset::AssetMetaCheck;
use bevy::prelude::*;
use wasm_bindgen::prelude::*;

use components::{DragState, TileZoom};

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
        .init_resource::<TileZoom>()
        .add_systems(Startup, (camera::setup, ui::setup_zoom_ui))
        .add_systems(
            Update,
            (
                camera::handle_input,
                camera::update_camera,
                tiles::update_tiles,
                tiles::update_fade,
                ui::update_zoom_text,
            )
                .chain(),
        )
        .run();
}
