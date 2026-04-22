use path_slash::PathExt;
use std::io::Cursor;
use wasm_bindgen::prelude::*;

#[cfg(feature = "console_error_panic_hook")]
pub use console_error_panic_hook::set_once as set_panic_hook;

/// List all file paths inside a .pak file.
///
/// # Arguments
/// * `data` - The raw bytes of a .pak file as a `Uint8Array` from JavaScript.
///
/// # Returns
/// An array of strings representing every file path in the pak archive.
#[wasm_bindgen]
pub fn list(data: &[u8]) -> Result<Vec<String>, JsError> {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    let mut cursor = Cursor::new(data);
    let pak = repak::PakBuilder::new()
        .reader(&mut cursor)
        .map_err(|e| JsError::new(&e.to_string()))?;

    let mount_point = std::path::PathBuf::from(pak.mount_point());

    let paths = pak
        .files()
        .into_iter()
        .map(|f| mount_point.join(&f).to_slash_lossy().into_owned())
        .collect();

    Ok(paths)
}
