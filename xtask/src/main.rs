use std::process::{Command, exit};

fn main() {
    let mut args = std::env::args().skip(1);
    let task = args.next();
    let extra: Vec<String> = args.collect();

    match task.as_deref() {
        Some("build-pakop") => wasm_pack("wasm/pakop", &extra),
        Some("build-wasm-map") => wasm_pack("wasm/wasm-map", &extra),
        _ => {
            eprintln!("Available tasks: build-pakop, build-wasm-map");
            exit(1);
        }
    }
}

fn wasm_pack(pkg: &str, extra: &[String]) {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap();
    let status = Command::new("wasm-pack")
        .args(["build", pkg, "--target", "bundler"])
        .args(extra)
        .current_dir(root)
        .status()
        .expect("wasm-pack not found in PATH");
    if !status.success() {
        exit(status.code().unwrap_or(1));
    }
}
