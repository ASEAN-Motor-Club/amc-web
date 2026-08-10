---
description: Environment variables — PUBLIC_* runtime config via $env/static/public vs VITE_* dev-proxy targets, and the CI/workflow env blocks they must be mirrored into.
globs:
  - .env*
  - vite.config.ts
  - .github/workflows/*.yml
---

# Environment configuration

Everything is baked in at build time — the site is statically built, so there is no runtime server env.

## `PUBLIC_*` — app config, via `$env/static/public`

| Variable                        | Purpose                                 |
| ------------------------------- | --------------------------------------- |
| `PUBLIC_API_BASE`               | Backend API origin                      |
| `PUBLIC_RADIO_STREAM_URL`       | Icecast radio stream URL                |
| `PUBLIC_DISCORD_LINK`           | Discord invite URL                      |
| `PUBLIC_DISCORD_EVENT_BASE`     | Discord events URL base                 |
| `PUBLIC_SEASON_NO`              | Current championship season number      |
| `PUBLIC_SEASON_START_DATE`      | Season start (ISO datetime with offset) |
| `PUBLIC_PATREON_LINK`           | Patreon URL                             |
| `PUBLIC_HOUSE_PRICE_MULTIPLIER` | Housing price multiplier                |

## `VITE_*` — dev-proxy targets, read by `loadEnv` in `vite.config.ts`

| Variable        | Proxy route                            |
| --------------- | -------------------------------------- |
| `VITE_ICE_CAST` | `/icecast-status` → `/status-json.xsl` |
| `VITE_API_BASE` | `/login/token` → `/api/login/token`    |

## Adding one

1. User-visible config is `PUBLIC_*`, imported from `$env/static/public`.
2. Add it to `.env.example` — `.env` is gitignored, so that file is the canonical list.
3. Add it to the `env:` block of `.github/workflows/{ci,check,cd}.yml` and set the repo variable, or CI builds inline an empty string.
