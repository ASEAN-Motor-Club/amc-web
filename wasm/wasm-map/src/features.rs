use bevy::prelude::*;
use bevy::window::{PrimaryWindow, RequestRedraw};
use std::collections::{HashMap, HashSet};
use std::sync::{Mutex, OnceLock};
use wasm_bindgen::prelude::*;

use crate::components::MapCamera;
use crate::constants::MAP_SIZE;
use crate::font::SansFont;

const MAP_REAL_X_LEFT: f32 = -1_280_000.0;
const MAP_REAL_Y_TOP: f32 = -320_000.0;
const MAP_REAL_SIZE: f32 = 2_200_000.0;

#[wasm_bindgen]
#[derive(Clone)]
pub struct FeaturePoint {
    pub x: f32,
    pub y: f32,
    #[wasm_bindgen(getter_with_clone)]
    pub label: String,
}

#[derive(Clone)]
pub struct LayerStyle {
    pub size: f32,
    pub stroke_size: f32,
    pub label_size: f32,
    pub color: String,
}

struct LayerStore {
    styles: HashMap<u32, LayerStyle>,
    features: HashMap<u32, Vec<FeaturePoint>>,
    dirty: HashSet<u32>,
}

static STORE: OnceLock<Mutex<LayerStore>> = OnceLock::new();

fn store() -> &'static Mutex<LayerStore> {
    STORE.get_or_init(|| {
        Mutex::new(LayerStore {
            styles: HashMap::new(),
            features: HashMap::new(),
            dirty: HashSet::new(),
        })
    })
}

pub fn create_layer(id: u32, style: LayerStyle) {
    let mut s = store().lock().unwrap();
    s.styles.insert(id, style);
    s.dirty.insert(id);
}

pub fn set_layer_features(id: u32, features: Vec<FeaturePoint>) {
    let mut s = store().lock().unwrap();
    s.features.insert(id, features);
    s.dirty.insert(id);
}

pub fn update_layer_feature_at(layer_id: u32, index: usize, point: FeaturePoint) {
    let mut s = store().lock().unwrap();
    if let Some(features) = s.features.get_mut(&layer_id)
        && let Some(slot) = features.get_mut(index)
    {
        *slot = point;
        s.dirty.insert(layer_id);
    }
}

#[derive(Component)]
pub struct DotMarker {
    pub layer_id: u32,
}

fn data_to_world(x: f32, y: f32) -> Vec2 {
    let mx = (x - MAP_REAL_X_LEFT) / MAP_REAL_SIZE * MAP_SIZE;
    let my = (y - MAP_REAL_Y_TOP) / MAP_REAL_SIZE * MAP_SIZE;
    Vec2::new(mx - MAP_SIZE / 2.0, MAP_SIZE / 2.0 - my)
}

fn dot_world_scale(camera: &MapCamera, window: &Window) -> f32 {
    (MAP_SIZE / 2f32.powf(camera.zoom)) / window.height()
}

fn parse_color(s: &str) -> Color {
    let s = s.trim();
    if let Some(inner) = s.strip_prefix("oklch(").and_then(|s| s.strip_suffix(')')) {
        let p: Vec<f32> = inner
            .split_whitespace()
            .filter_map(|v| v.parse().ok())
            .collect();
        if p.len() >= 3 {
            return Color::oklcha(p[0], p[1], p[2], 1.0);
        }
    }
    if let Some(hex) = s.strip_prefix('#')
        && hex.len() == 6
    {
        let r = f32::from(u8::from_str_radix(&hex[0..2], 16).unwrap_or(255)) / 255.0;
        let g = f32::from(u8::from_str_radix(&hex[2..4], 16).unwrap_or(255)) / 255.0;
        let b = f32::from(u8::from_str_radix(&hex[4..6], 16).unwrap_or(255)) / 255.0;
        return Color::srgb(r, g, b);
    }
    if let Some(inner) = s.strip_prefix("rgb(").and_then(|s| s.strip_suffix(')')) {
        let p: Vec<f32> = inner
            .split(',')
            .filter_map(|v| v.trim().parse().ok())
            .collect();
        if p.len() >= 3 {
            return Color::srgb(p[0] / 255.0, p[1] / 255.0, p[2] / 255.0);
        }
    }
    Color::WHITE
}

pub fn sync_features(
    mut commands: Commands,
    mut meshes: ResMut<Assets<Mesh>>,
    mut materials: ResMut<Assets<ColorMaterial>>,
    sans_font: Res<SansFont>,
    dots: Query<(Entity, &DotMarker)>,
    camera_query: Query<&MapCamera>,
    windows: Query<&Window, With<PrimaryWindow>>,
    mut redraw: MessageWriter<RequestRedraw>,
) {
    let work: Vec<(u32, Option<(LayerStyle, Vec<FeaturePoint>)>)> = {
        let mut s = store().lock().unwrap();
        if s.dirty.is_empty() {
            return;
        }
        let dirty_ids: Vec<u32> = s.dirty.drain().collect();
        dirty_ids
            .into_iter()
            .map(|id| {
                let data = match (s.styles.get(&id), s.features.get(&id)) {
                    (Some(style), Some(feats)) => Some((style.clone(), feats.clone())),
                    _ => None,
                };
                (id, data)
            })
            .collect()
    };

    let initial_dot_scale = match (camera_query.single(), windows.single()) {
        (Ok(cam), Ok(win)) => dot_world_scale(cam, win),
        _ => 1.0,
    };

    let dirty_ids: HashSet<u32> = work.iter().map(|(id, _)| *id).collect();
    for (entity, marker) in dots.iter() {
        if dirty_ids.contains(&marker.layer_id) {
            commands.entity(entity).despawn();
        }
    }

    for (layer_id, render_data) in work {
        let Some((style, features)) = render_data else {
            continue;
        };

        let fill = parse_color(&style.color);
        let dot_stroke = Color::srgba(0.0, 0.0, 0.0, 0.7);
        let r = style.size / 2.0;
        let sw = style.stroke_size.max(0.0);
        let label_y = -(r + sw + style.label_size * 0.7);

        for feat in &features {
            let pos = data_to_world(feat.x, feat.y);

            commands
                .spawn((
                    Mesh2d(meshes.add(Circle::new(r + sw))),
                    MeshMaterial2d(materials.add(ColorMaterial::from_color(dot_stroke))),
                    Transform {
                        translation: pos.extend(1.0),
                        scale: Vec3::new(initial_dot_scale, initial_dot_scale, 1.0),
                        ..default()
                    },
                    DotMarker { layer_id },
                ))
                .with_children(|p| {
                    p.spawn((
                        Mesh2d(meshes.add(Circle::new(r))),
                        MeshMaterial2d(materials.add(ColorMaterial::from_color(fill))),
                        Transform::from_translation(Vec3::Z * 0.05),
                    ));

                    if !feat.label.is_empty() && style.label_size > 0.0 {
                        p.spawn((
                            Text2d::new(feat.label.clone()),
                            TextFont {
                                font: sans_font.0.clone(),
                                font_size: style.label_size,
                                ..default()
                            },
                            TextColor(Color::WHITE),
                            TextBackgroundColor(Color::srgba(0.0, 0.0, 0.0, 0.4)),
                            Transform::from_translation(Vec3::new(0.0, label_y, 0.10)),
                        ));
                    }
                });
        }
    }

    redraw.write(RequestRedraw);
}

pub fn update_dot_scale(
    camera_query: Query<&MapCamera>,
    windows: Query<&Window, With<PrimaryWindow>>,
    mut dots: Query<&mut Transform, With<DotMarker>>,
) {
    let Ok(camera) = camera_query.single() else {
        return;
    };
    let Ok(window) = windows.single() else {
        return;
    };

    let scale = dot_world_scale(camera, window);
    for mut transform in &mut dots {
        transform.scale = Vec3::new(scale, scale, 1.0);
    }
}
