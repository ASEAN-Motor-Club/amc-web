---
description: The lefthook pre-commit pipeline and its CI mirror — which checks run on commit and what that means for committing.
---

# Git hooks (lefthook)

`lefthook.yml` defines one `piped: true` pre-commit hook with two jobs, each gated on staged paths. Jobs inside a group run sequentially in listed order, which is why codegen lands before the checks.

1. **wasm** — staged `wasm/*`: `dotnet format wasm/pakop --verify-no-changes`, then `pnpm build:pakop`.
2. **frontend** — staged `src/*`: `pnpm paraglide:compile` → `pnpm proto:generate` → `pnpm lint` → `pnpm check` → `pnpm test`.

Hooks self-install because `lefthook` is whitelisted under `allowBuilds` in `pnpm-workspace.yaml`.

## Implications

- Any commit touching `src/` runs the full lint/typecheck/test suite. Expect it to take a while; don't kill it mid-run.
- `pnpm lint` only _checks_ formatting — run `pnpm format` first or the commit fails.
- Codegen refreshes generated files before the checks, but you still have to stage anything that changed.
- `messages/*.json` sits outside both globs, so a commit that only touches messages regenerates nothing — run `pnpm paraglide:compile` yourself. `.proto` sources live under `src/`, so they do trigger the frontend job.
- `.github/workflows/check.yml` mirrors the frontend job and `wasm.yml` mirrors the wasm one, so a green local run predicts CI.

Pre-flight: `pnpm format && pnpm lint && pnpm check && pnpm test`.
