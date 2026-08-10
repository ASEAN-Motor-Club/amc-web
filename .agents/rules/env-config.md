---
description: Environment variables — PUBLIC_* app config via $env/static/public vs VITE_* dev-proxy targets, and the three places a new var must be registered.
globs:
  - .env*
  - vite.config.ts
  - .github/workflows/*.yml
---

# Environment configuration

Everything is inlined at build time — the site is statically built, so there is no runtime server env and no way to change a value after `pnpm build`.

- **`PUBLIC_*`** is app config, imported as `import { PUBLIC_API_BASE } from '$env/static/public'`. All user-visible configuration goes here.
- **`VITE_*`** is read only by `loadEnv` in `vite.config.ts` to point dev-server proxies at a backend. App code never imports it.

`.env` is gitignored; `.env.example` is the canonical list of both.

Adding a variable takes three edits, and skipping any one of them ships an empty string:

1. `.env.example` (and your own `.env`).
2. The `env:` block of `.github/workflows/{ci,check,cd}.yml`.
3. The repo variable: `gh variable set <NAME> --body '<value>'`.
