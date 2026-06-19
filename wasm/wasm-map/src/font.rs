use bevy::prelude::*;

static NOTO_SANS_BYTES: &[u8] = include_bytes!("../assets/fonts/NotoSans-Regular.ttf");

#[derive(Resource)]
pub struct SansFont(pub Handle<Font>);

pub fn setup_fonts(mut commands: Commands, mut fonts: ResMut<Assets<Font>>) {
    let font = Font::try_from_bytes(NOTO_SANS_BYTES.to_vec()).expect("valid font");
    let handle = fonts.add(font);
    commands.insert_resource(SansFont(handle));
}
