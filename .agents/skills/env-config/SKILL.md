---
name: env-config
description: Environment variables in the AMC web app — PUBLIC_* vars consumed via $env/static/public vs VITE_* vars used only for dev proxies. Read when adding configuration or touching .env.
---

# Environment Configuration

Two distinct prefixes are in use — don't mix them up:

## `PUBLIC_*` — app runtime config (via `$env/static/public`)

Consumed in app code with `import { PUBLIC_API_BASE } from '$env/static/public';` and statically inlined at build time. Current vars (see `.env.example`):

| Variable                        | Purpose                                 |
| ------------------------------- | --------------------------------------- |
| `PUBLIC_API_BASE`               | Backend API origin for fetches/streams  |
| `PUBLIC_DISCORD_LINK`           | Discord invite URL                      |
| `PUBLIC_DISCORD_EVENT_BASE`     | Discord events URL base                 |
| `PUBLIC_SEASON_NO`              | Current championship season number      |
| `PUBLIC_SEASON_START_DATE`      | Season start (ISO datetime with offset) |
| `PUBLIC_PATREON_LINK`           | Patreon URL                             |
| `PUBLIC_HOUSE_PRICE_MULTIPLIER` | Housing price multiplier                |
| `PUBLIC_RADIO_STREAM_URL`       | Icecast radio stream URL                |

## `VITE_*` — dev-server proxy targets only (via `loadEnv` in `vite.config.ts`)

Not imported by app code; they configure the Vite dev proxy:

| Variable        | Proxy route                            |
| --------------- | -------------------------------------- |
| `VITE_ICE_CAST` | `/icecast-status` → `/status-json.xsl` |
| `VITE_API_BASE` | `/login/token` → `/api/login/token`    |

## Rules

- New user-visible config → `PUBLIC_*`, added to `.env.example`, imported from `$env/static/public`.
- Because the site is statically built, all env values are baked in at build time — there is no runtime server env.
- `.env` is gitignored; keep `.env.example` up to date as the canonical list.

Related: [[api-layer]], [[architecture]]
