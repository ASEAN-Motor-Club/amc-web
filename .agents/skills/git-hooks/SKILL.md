---
name: git-hooks
description: The lefthook pre-commit pipeline for the AMC web repo — which checks run on commit (dotnet format/WASM build, paraglide/proto codegen, format/lint/check/test) and what that implies for committing. Read before committing or debugging a failed commit.
---

# Git Hooks (lefthook)

Pre-commit hooks are managed by **lefthook** (`lefthook.yml`), installed via the `lefthook` dev dependency. The pipeline is **piped** (stages run in order; each stage's jobs run in parallel):

1. **wasm** (only when `wasm/*` files are staged):
   - `dotnet format wasm/pakop --verify-no-changes`
   - `pnpm build:pakop`
2. **pre-frontend** (when `src/*` files are staged):
   - `pnpm paraglide:compile`
   - `pnpm proto:generate`
3. **frontend** (when `src/*` files are staged):
   - `pnpm lint` · `pnpm check` · `pnpm test`

## Implications

- Commits touching `src/` run the **full** lint/typecheck/test suite — expect commits to take a while; don't kill them mid-run.
- The hook only **checks** formatting (`pnpm lint` includes a Prettier check) — run `pnpm format` yourself before committing or the commit fails.
- C# changes (`wasm/pakop`) must pass `dotnet format` and build successfully (needs .NET 10 SDK + `wasm-tools` workload).
- Codegen (paraglide, proto) runs before checks, so stale generated files get refreshed automatically — but you still need to stage the regenerated output if it changed.
- Run the same commands manually before committing to avoid hook failures: `pnpm format && pnpm lint && pnpm check && pnpm test`.

Related: [[testing]], [[architecture]]
