---
name: project-structure
description: Directory layout of the AMC web repo — where UI components, feature components, routes, data, schemas, WASM crates, and generated code live. Read before adding new files or searching for existing code.
---

# Project Structure

```
.
├── src/
│   ├── lib/
│   │   ├── ui/                  # Reusable UI components (Button, Card, Icon, Modal, Select,
│   │   │                        #   OlMap, EditorOlMap, Table, Tooltip, …) — one folder per
│   │   │                        #   component with colocated .stories.svelte and context.ts
│   │   ├── components/          # Feature components by domain (Map, Navbar, Championship,
│   │   │                        #   Radio, TrackEditor, Home, EventCard, Locale, …)
│   │   ├── data/                # Static game data (deliveryPoint, house, area, cargo, types)
│   │   ├── api/                 # API client modules (_api.ts base + per-domain files)
│   │   │   └── proto/           # .proto definitions + generated/ _pb.ts files
│   │   ├── assets/              # data JSONs, images, lottie, mappings, teams, videos
│   │   ├── paraglide/           # Generated i18n runtime + messages (do NOT edit)
│   │   ├── schema/              # Zod schemas (track, pin) — uses zod/mini
│   │   ├── types/               # Shared TypeScript types
│   │   ├── utils/               # Utility functions, mostly with colocated .test.ts
│   │   ├── tw-var.ts            # Exported Tailwind color variables (oklch) for JS use
│   │   ├── date.ts              # Date utilities
│   │   ├── font-sans-em.ts      # Font metrics helpers
│   │   └── realtimeDate.svelte.ts  # Reactive current-time rune helper
│   ├── routes/
│   │   ├── (map)/               # Map layout group: map, deliveries, housing, jobs, players
│   │   ├── championship/        # Championship results and details
│   │   ├── pak/                 # Pak file inspector + conflict checker (uses pakop WASM)
│   │   ├── track/               # Track editor
│   │   ├── radio/               # Radio page
│   │   └── ankhr/, colors/      # Misc pages
│   ├── stories/                 # Storybook reference stories only (e.g. color palette);
│   │                            #   component stories are colocated in src/lib/ui/*
│   ├── hooks.ts                 # reroute → paraglide deLocalizeUrl
│   └── app.css / app.html / app.d.ts
├── messages/                    # Paraglide source messages: en, id, ms, th, tl, vi
├── wasm/pakop/                  # Rust WASM crate (output in wasm/pakop/pkg/, pnpm pkg "pakop")
├── xtask/                       # Rust build orchestrator (cargo xtask build-pakop)
├── vite-plugins/                # Custom Vite plugins (webmanifest)
├── static/                      # Static assets served as-is
└── scripts/                     # (currently empty)
```

Conventions:

- New UI component → `src/lib/ui/<Name>/<Name>.svelte` + `<Name>.stories.svelte`; add `context.ts` if it participates in parent/child composition.
- New feature code → `src/lib/components/<Domain>/`.
- Generated directories (`src/lib/paraglide/`, `src/lib/api/proto/generated/`, `wasm/*/pkg/`) must never be hand-edited — regenerate with `pnpm paraglide:compile`, `pnpm proto:generate`, or `cargo xtask build-pakop`.

Related: [[architecture]], [[path-aliases]], [[codebase-patterns]]
