---
description: Where everything lives — UI vs feature components, routes, data, schemas, WASM, generated output — and where new files go.
---

# Project structure

```
src/
  lib/
    ui/           reusable components, one dir each (Button, Card, Icon, Modal, Select, Table,
                  Tooltip, OlMap, EditorOlMap, CodeEditor, MarkdownText, Lottie, …) with
                  colocated .stories.svelte and, where they compose, context.ts
    components/   feature components by domain (Map, Navbar, TrackEditor, Championship, Radio,
                  Home, EventCard, Locale, CommonHead, …)
    api/          _api.ts + _stream.svelte.ts + queryClient.ts + per-domain modules
      proto/      .proto sources, hand-written vehicleKeyUtils.ts, generated/ (gitignored)
    data/         static game data (deliveryPoint, house, area, cargo, types)
    schema/       zod/mini schemas (track, pin)
    assets/       data JSONs, images, lottie, mappings, teams, videos
    utils/        helpers, mostly with colocated .test.ts
    types/        shared TypeScript types
    paraglide/    generated i18n runtime (never edit)
    tw-var.ts     oklch colors and metrics for use from TS
    date.ts       the only allowed date-fns entry point
    realtimeDate.svelte.ts, font-sans-em.ts
  routes/
    (map)/        map layout group: map, deliveries, housing, jobs, players
    championship/ track/ pak/ radio/ ankhr/ colors/
  hooks.ts, hooks.server.ts, app.html, app.css, app.d.ts, globals.d.ts
  stories/        Storybook reference stories only (component stories are colocated)
messages/         paraglide sources (en, th, id active; ms, tl, vi are parked stubs)
project.inlang/   paraglide project config (hand-edited)
wasm/pakop/       C# .NET WASM project + committed npm shim (workspace package "pakop")
vite-plugins/     webmanifest.ts, dotnet-wasm-asset.ts
static/  test_pak/  .storybook/  .github/workflows/
```

Placement:

- New UI component → `src/lib/ui/<Name>/<Name>.svelte` (+ `<Name>.stories.svelte`, plus `context.ts` if it composes with children). Import it by full path; only `MarkdownText` has a barrel.
- New feature code → `src/lib/components/<Domain>/`.
- New shared helper → `src/lib/utils/<name>.ts` with a colocated test.
- Generated trees (`src/lib/paraglide/`, `src/lib/api/proto/generated/`, `wasm/pakop/bin|obj`) are regenerated, never edited.
