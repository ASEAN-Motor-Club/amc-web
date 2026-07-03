---
name: git-hooks
description: The lefthook pre-commit pipeline for the AMC web repo — which checks run on commit (Rust fmt/clippy/WASM build, paraglide/proto codegen, format/lint/check/test) and what that implies for committing. Read before committing or debugging a failed commit.
---

# Git Hooks (lefthook)

Pre-commit hooks are managed by **lefthook** (`lefthook.yml`), installed via the `lefthook` dev dependency. The pipeline is **piped** (stages run in order; each stage's jobs run in parallel):

1. **wasm** (only when `wasm/*` files are staged):
   - `cargo fmt --all -- --check`
   - `cargo clippy --target wasm32-unknown-unknown`
   - `cargo xtask build-pakop --dev`
2. **pre-frontend** (when `src/*` files are staged):
   - `pnpm paraglide:compile`
   - `pnpm proto:generate`
3. **frontend** (when `src/*` files are staged):
   - `pnpm format` (writes!) · `pnpm lint` · `pnpm check` · `pnpm test`

## Implications

- Commits touching `src/` run the **full** format/lint/typecheck/test suite — expect commits to take a while; don't kill them mid-run.
- `pnpm format` rewrites files during the hook; if a commit fails after formatting, re-stage the formatted files.
- Rust changes must pass fmt + clippy for the `wasm32-unknown-unknown` target and build successfully.
- Codegen (paraglide, proto) runs before checks, so stale generated files get refreshed automatically — but you still need to stage the regenerated output if it changed.
- Run the same commands manually before committing to avoid hook failures: `pnpm format && pnpm lint && pnpm check && pnpm test`.

Related: [[testing]], [[architecture]]
