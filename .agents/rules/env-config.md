---
description: Environment variables — PUBLIC_* app config declared in src/env.ts and imported from $app/env/public vs VITE_* dev-proxy targets, and the four places a new var must be registered.
globs:
  - .env*
  - src/env.ts
  - vite.config.ts
  - .github/workflows/*.yml
---

# Environment configuration

Everything is inlined at build time — the site is statically built, so there is no runtime server env and no way to change a value after `pnpm build`.

- **`PUBLIC_*`** is app config, declared in `src/env.ts` (`defineEnvVars`, every entry `{ public: true, static: true }` so it is inlined) and imported as `import { PUBLIC_API_BASE } from '$app/env/public'`. All user-visible configuration goes here. `$env/static/public` is deprecated since Kit 3 — don't reintroduce it.
- **`VITE_*`** is read only by `loadEnv` in `vite.config.ts` to point dev-server proxies at a backend. App code never imports it.

`.env` is gitignored; `.env.example` is the canonical list of both.

Adding a variable takes four edits, and skipping any one of them ships an empty string or an unresolvable import:

1. `src/env.ts`.
2. `.env.example` (and your own `.env`).
3. The `env:` block of `.github/workflows/{ci,check,cd}.yml`.
4. The repo variable: `gh variable set <NAME> --body '<value>'`.
