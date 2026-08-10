---
description: The lefthook pre-commit pipeline — what runs on commit, what it does not cover, and the pre-flight that avoids a failed commit.
---

# Git hooks (lefthook)

One piped pre-commit hook, gated on staged paths (`lefthook.yml` is the source of truth): staged `wasm/*` runs the dotnet format check and a WASM build; staged `src/*` runs codegen first, then `pnpm lint`, `pnpm check` and `pnpm test`. Jobs run sequentially, which is why codegen lands before the checks.

- A commit touching `src/` runs the full lint/typecheck/test suite. It takes a while — don't kill it mid-run.
- `pnpm lint` only _checks_ formatting, so run `pnpm format` first or the commit fails.
- Codegen refreshes generated files, but you still have to stage whatever changed.
- Files outside both globs (notably `messages/*.json`) trigger nothing — regenerate by hand.
- CI mirrors both jobs, so a green local run predicts CI.

Pre-flight: `pnpm format && pnpm lint && pnpm check && pnpm test`.
