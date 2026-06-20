# ASEAN Motor Club Web - AI Coding Agent Instructions

## Architecture Overview

This is a **SvelteKit static site** using modern Svelte 5 with TypeScript, built for the ASEAN Motor Club community. The app uses the static adapter with internationalization and custom styling.

### Key Technologies & Patterns

- **Svelte 5**: Uses new runes syntax (`$state`, `$derived`, `$effect`, `$props`) and snippets
- **UnoCSS with Wind4 preset**: Tailwind CSS v4.0 syntax with Svelte Scoped integration
- **Paraglide i18n**: All user-facing text must use `m['message.key']()` from `$lib/paraglide/messages`
- **Static generation**: Build outputs to `build/` directory with prerendered pages

## Critical Development Patterns

### Internationalization (Required)

Every user-facing string must use Paraglide:

```svelte
<script>
  import { m } from '$messages';
</script>

<h1>{m.site_name()}</h1><p>{m['radio.title']()}</p>
```

**Important**: Use `m['key']()` syntax for internationalized strings.

### Component Architecture

- **UI Components**: Located in `src/lib/ui/` with TypeScript props interfaces and Storybook stories
- **Feature Components**: In `src/lib/components/` organized by feature domain
- **Context Pattern**: UI components use Svelte context for composition (see `InputGroup` with `TextInput`, `Select`, `Slider`)

### Svelte 5 Component Creation Guidelines

- **Use Svelte 5 runes syntax only** (`$props`, `$state`, `$derived`, `$effect`). Do not use legacy `$:` reactive statements.
- **Props must be properly typed and documented** using TypeScript JSDoc comments for each prop.
- **Class props**: If your component accepts a `class` prop, type it as `ClassValue` from `svelte/elements`.
- **Class merging**: If your component extends an existing class, use `twMerge(existingClass, clsx(propsClass))` to merge classes safely.

#### Minimal Example

```svelte
<script lang="ts">
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  export type TextSkeletonProps = {
    /**
     * CSS class to apply to the text skeleton component
     */
    class?: ClassValue;
  };

  const { class: propsClass }: TextSkeletonProps = $props();
</script>

<span
  class={twMerge(
    'inline-block animate-pulse rounded-md bg-gray-500/20 text-transparent select-none',
    clsx(propsClass),
  )}>.</span
>
```

### Icons & Assets

Use the `Icon` component with Material Symbols:

```svelte
<Icon class="i-material-symbols:favorite-outline-rounded" size="sm" />
```

Prefer `-rounded` suffix variants when available.

## Essential Commands

```bash
# Development
pnpm dev                 # Start dev server
pnpm dev:host           # Start dev server with host access
pnpm storybook          # Component development

# Build & Deploy
pnpm build              # Build the static site
pnpm preview            # Preview built site locally
pnpm preview:host       # Preview built site with host access
pnpm paraglide:compile  # Regenerate i18n messages
pnpm proto:generate     # Regenerate _pb.ts files from .proto definitions
cargo xtask build-pakop           # Build pakop WASM module (release)
cargo xtask build-pakop --dev     # Build pakop WASM module (dev, fast)

# Quality Checks
pnpm checklist          # Runs format, lint, paraglide:compile, check, test
pnpm format             # Prettier formatting
pnpm lint               # ESLint + Prettier check
pnpm lint:fix           # Auto-fix ESLint issues
pnpm check              # TypeScript + Svelte check
pnpm check:watch        # TypeScript + Svelte check in watch mode
pnpm test               # Run all tests. Prefer this one since you don't have to terminate it
pnpm test:unit          # Run unit tests in watch mode
pnpm build:storybook    # Build Storybook for deployment
```

## Project Structure Essentials

```
src/
├── lib/
│   ├── ui/              # Reusable UI components (Button, Card, Icon, Modal, OlMap, etc.)
│   ├── components/      # Feature components (Map, Navbar, Championship, Radio, TrackEditor, etc.)
│   ├── data/            # Static game data (deliveryPoint, house, area, cargo, etc.)
│   ├── api/             # API interaction logic + protobuf (api/proto/)
│   ├── assets/          # Static assets (data JSONs, images, lottie, videos, mappings)
│   ├── paraglide/       # Generated i18n files (don't edit manually)
│   ├── schema/          # Zod schemas and validation
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── wasm/            # WASM module wrappers (wasm/pakop/)
│   ├── tw-var.ts        # Exported color variables (oklch) for programmatic use
│   └── date.ts          # Date utility functions
├── routes/
│   ├── (map)/           # Map-related routes (map, deliveries, housing, jobs, players)
│   ├── championship/    # Championship results and details
│   ├── pak/             # Pak file inspector and conflict checker
│   ├── track/           # Track editor
│   ├── radio/           # Radio page
│   └── ankhr, colors    # Misc pages
└── stories/             # Storybook stories
```

### WASM modules

| Module  | Source        | Build command                   |
| ------- | ------------- | ------------------------------- |
| `pakop` | `wasm/pakop/` | `cargo xtask build-pakop --dev` |

This output to their respective `pkg/` directories and are referenced as `workspace:*` packages.

## Testing & Development

- **Component Stories**: Every UI component should have a `.stories.svelte` file
- **Testing**: Uses Vitest with Playwright browser provider for component testing in real browsers
- **Type Safety**: Leverage TypeScript extensively, especially for component props

## Common Gotchas

2. **UnoCSS Compatibility**: Some Tailwind classes might not work in UnoCSS - refer to Wind4 preset documentation
3. **i18n**: Never hardcode user-facing strings - always use `m['key']()`
4. **Svelte 5**: Use new runes syntax, not legacy `$:` reactive statements
5. **Context**: UI components often depend on parent context (InputGroup, Select, etc.)
6. **Static Generation**: Site must be statically generable

## External Dependencies

- **OpenLayers (ol)**: For advanced map functionality
- **Lottie Web**: For animations
- **Zod**: For schema validation
- **date-fns**: For date manipulation and formatting
- **GSAP**: For advanced animations and transitions
- **Lodash ES**: For utility functions
