use digest_io::IoWrapper;
use path_slash::PathExt;
use sha2::{Digest, Sha256};
use std::io::Cursor;
use unreal_asset::{
    Asset, asset::ExportReaderTrait, engine_version::EngineVersion, exports::Export,
};
use wasm_bindgen::prelude::*;

#[cfg(feature = "console_error_panic_hook")]
pub use console_error_panic_hook::set_once as set_panic_hook;

#[wasm_bindgen(getter_with_clone)]
pub struct FileEntry {
    pub raw_path: String,
    pub path: String,
    pub hash: String,
}

fn list_ops(data: &[u8], skip_hash: bool) -> Result<Vec<FileEntry>, JsError> {
    let pak = {
        let mut cursor = Cursor::new(data);
        repak::PakBuilder::new()
            .reader(&mut cursor)
            .map_err(|e| JsError::new(&e.to_string()))?
    };

    let mount_point = std::path::PathBuf::from(pak.mount_point());

    let arr = pak
        .files()
        .iter()
        .map(|raw_path| {
            let joined_path = mount_point.join(&raw_path).to_slash_lossy().into_owned();
            let path = joined_path
                .strip_prefix("../../../")
                .unwrap_or(&joined_path)
                .to_owned();

            let hash = if skip_hash {
                "".to_owned()
            } else {
                let mut data_cursor = Cursor::new(data);
                let mut hasher = IoWrapper(Sha256::new());
                pak.read_file(&raw_path, &mut data_cursor, &mut hasher)
                    .map_err(|e| JsError::new(&e.to_string()))?;

                let hash_bytes = hasher.0.finalize();
                hex::encode(hash_bytes)
            };

            Ok(FileEntry {
                raw_path: raw_path.to_owned(),
                path,
                hash,
            })
        })
        .collect::<Result<Vec<_>, JsError>>()?;

    Ok(arr)
}

/// List all file paths inside a .pak file.
#[wasm_bindgen]
pub fn list(data: &[u8]) -> Result<Vec<String>, JsError> {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    Ok(list_ops(data, true)?.into_iter().map(|e| e.path).collect())
}

/// List all file paths and their SHA-256 hashes inside a .pak file.
#[wasm_bindgen]
pub fn list_hash(data: &[u8]) -> Result<Vec<FileEntry>, JsError> {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    list_ops(data, false)
}

pub fn get_exports(pak_data: &[u8], raw_path: &str) -> Option<Vec<Export>> {
    let pak = {
        let mut cursor = Cursor::new(pak_data);
        repak::PakBuilder::new()
            .reader(&mut cursor)
            .map_err(|e| JsError::new(&e.to_string()))
            .ok()?
    };

    let asset_data = {
        let mut out = Vec::new();
        let mut cursor = Cursor::new(pak_data);
        pak.read_file(raw_path, &mut cursor, &mut out)
            .map_err(|e| JsError::new(&e.to_string()))
            .ok()?;
        out
    };

    let bulk_data = {
        let bulk_path = raw_path
            .strip_suffix(".uasset")
            .map(|base| format!("{base}.uexp"));

        bulk_path.and_then(|p| {
            let mut out = Vec::new();
            let mut cursor = Cursor::new(pak_data);
            pak.read_file(&p, &mut cursor, &mut out).ok()?;
            Some(out)
        })
    };

    let asset_cursor = Cursor::new(asset_data);
    let bulk_cursor = bulk_data.map(Cursor::new);

    let mut asset = Asset::new(asset_cursor, bulk_cursor, EngineVersion::VER_UE5_2)
        .map_err(|e| JsError::new(&e.to_string()))
        .ok()?;

    let exports_len = asset.asset_data.exports.len();

    let exports = (0..exports_len)
        .map(|i| asset.read_export(i).ok())
        .collect::<Option<Vec<_>>>()?;

    Some(exports)
}
