---
name: date-fns
description: Date handling in the AMC web repo — date-fns v4 for manipulation/formatting, shared helpers in src/lib/date.ts, reactive current time via realtimeDate.svelte.ts. Read before writing date logic.
---

# date-fns

- All date manipulation and formatting uses **date-fns v4** — no moment/dayjs/raw `Date` math.
- Check `src/lib/date.ts` for existing shared helpers before writing new ones; add reusable date utilities there.
- For UI that displays "now" reactively, use the rune helper in `src/lib/realtimeDate.svelte.ts` rather than manual `setInterval`.
- Displayed dates must respect the active locale — get it via `getMtLocale` (`src/lib/utils/getMtLocale.ts`) / paraglide runtime rather than hardcoding a locale.
- Season-related date config comes from `PUBLIC_SEASON_START_DATE` (ISO string with timezone offset) — parse it, don't re-declare it.

Related: [[env-config]], [[codebase-patterns]]
