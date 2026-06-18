mod camera;
mod components;
mod constants;
mod tiles;
#[cfg(debug_assertions)]
mod debug_ui;

use bevy::asset::AssetMetaCheck;
use bevy::prelude::*;
use bevy::winit::WinitSettings;
use wasm_bindgen::prelude::*;

use components::DragState;
#[cfg(debug_assertions)]
use components::{ShowDebugTiles, TileZoom};

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
    .add_systems(Startup, camera::setup)
    .add_systems(
        Update,
        (
            camera::handle_input,
            camera::update_camera,
            tiles::update_tiles,
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
