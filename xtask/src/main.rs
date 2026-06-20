use std::process::{Command, exit};

fn main() {
    let mut args = std::env::args().skip(1);
    let task = args.next();
    let extra: Vec<String> = args.collect();

    match task.as_deref() {
        Some("build-pakop") => wasm_pack("wasm/pakop", &extra, &[]),
        _ => {
            eprintln!("Available tasks: build-pakop, build-wasm-map");
            exit(1);
        }
    }
}

fn wasm_pack(pkg: &str, extra: &[String], features: &[&str]) {
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .parent()
        .unwrap();
    let mut cmd = Command::new("wasm-pack");
    cmd.args(["build", pkg, "--target", "bundler"])
        .args(extra)
        .current_dir(root);
    if !features.is_empty() {
        cmd.args(["--features", &features.join(",")]);
    }
    let status = cmd.status().expect("wasm-pack not found in PATH");
    if !status.success() {
        exit(status.code().unwrap_or(1));
    }
}
