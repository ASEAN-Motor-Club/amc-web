---
name: pakop-wasm
description: The pakop Rust WASM module — what it does (pak-file inspection/hashing), how to build it (cargo xtask build-pakop), and how to consume it (lazy dynamic import). Read before touching wasm/pakop or the pak routes.
---

# pakop (Rust WASM)

- Rust crate at `wasm/pakop/`; provides pak-file inspection and hashing (`list_hash`, `get_datatables_names`, `print_exports`) used by the `/pak` routes (`src/routes/pak/`).
- Build with `cargo xtask build-pakop --dev` (fast dev build) or `cargo xtask build-pakop` (release). Extra args forward to `wasm-pack build --target bundler`; output lands in `wasm/pakop/pkg/`.
- `pkg/` is exposed as the pnpm workspace package `pakop` (`pakop: workspace:*`); `pkg/` is generated — never hand-edit.
- **Always lazy-load** to keep WASM out of the main bundle:

```ts
const { list_hash } = await import('pakop');
```

- Rust changes must pass `cargo fmt` + `cargo clippy --target wasm32-unknown-unknown` (enforced by lefthook) and require a rebuild before the frontend sees them.
- Vite side: `vite-plugin-wasm` is enabled and `server.fs.allow` includes `wasm/`.

Related: [[architecture]], [[git-hooks]], [[path-aliases]]
