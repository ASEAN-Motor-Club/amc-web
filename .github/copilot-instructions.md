# ASEAN Motor Club Web - AI Coding Agent Instructions

## Architecture Overview

This is a **SvelteKit static site** using modern Svelte 5 with TypeScript, built for the ASEAN Motor Club community. The app uses the static adapter with internationalization and custom styling.

### Key Technologies & Patterns

- **Svelte 5**: Uses new runes syntax (`$state`, `$derived`, `$effect`, `$props`) and snippets
- **UnoCSS with Wind4 preset**: Tailwind CSS v4.0 syntax with Svelte Scoped integration
- **Paraglide i18n**: All user-facing text must use `msg['message.key']()` from `$lib/paraglide/messages`
- **Static generation**: Build outputs to `build/` directory with prerendered pages

## Critical Development Patterns

### Internationalization (Required)

Every user-facing string must use Paraglide:

```svelte
<script>
  import { getMsg } from '$lib/components/Locale/locale.svelte';
  const msg = $derived.by(getMsg);
</script>

<h1>{msg['site_name']()}</h1><p>{msg['radio.title']()}</p>
```

**Important**: The import must be renamed from `m` to `msg` to prevent UnoCSS from interpreting it as a margin utility class during static analysis.

### Component Architecture

- **UI Components**: Located in `src/lib/ui/` with TypeScript props interfaces and Storybook stories
- **Feature Components**: In `src/lib/components/` organized by feature domain
- **Context Pattern**: UI components use Svelte context for composition (see `InputGroup` with `TextInput`, `Select`, `Slider`)

### Svelte 5 Component Creation Guidelines

- **Use Svelte 5 runes syntax only** (`$props`, `$state`, `$derived`, `$effect`). Do not use legacy `$:` reactive statements.
- **Props must be properly typed and documented** using TypeScript JSDoc comments for each prop.
- **Class props**: If your component accepts a `class` prop, type it as `ClassValue` from `svelte/elements`.
- **Class merging**: If your component extends an existing class, use `twMerge(existingClass, clsx(propsClassName))` to merge classes safely.

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

  const { class: propsClassName }: TextSkeletonProps = $props();
</script>

<span
  class={twMerge(
    'inline-block select-none rounded-md bg-neutral-500/20 text-transparent motion-safe:animate-pulse',
    clsx(propsClassName),
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
npm run dev                 # Start dev server
npm run storybook          # Component development

# Build & Deploy
npm run build              # Builds site + runs CSS optimization script
npm run paraglide:compile  # Regenerate i18n messages (auto-runs in build)

# Quality Checks
npm run checklist          # Runs format, lint, check, test
npm run format             # Prettier formatting
npm run lint               # ESLint + Prettier check
npm run check              # TypeScript + Svelte check
npm run test               # Run all tests
npm run check:uno-classes  # Check for non-UnoCSS classes in build output
```

## Build Process Specifics

1. **CSS Optimization**: `scripts/remove-unused-css-vars.js` runs post-build to remove unused CSS variables and update file hashes
2. **Static Assets**: Development uses `static_dev/`, production uses `static/`
3. **Hooks**: `src/hooks.server.ts` handles UnoCSS placeholders and Paraglide middleware

## Project Structure Essentials

```
src/
├── lib/
│   ├── ui/              # Reusable UI components (Button, Modal, etc.)
│   ├── components/      # Feature-specific components (Map, Housing, etc.)
│   ├── data/           # Static data and type definitions
│   ├── api/            # API interaction logic
│   ├── paraglide/      # Generated i18n files (don't edit manually)
│   ├── tw-var.ts       # Exported color variables for programmatic use
│   └── utils/          # Utility functions
├── routes/             # SvelteKit file-based routing
└── stories/            # Storybook stories
```

## Testing & Development

- **Component Stories**: Every UI component should have a `.stories.svelte` file
- **Testing**: Uses Vitest with Testing Library for Svelte
- **Type Safety**: Leverage TypeScript extensively, especially for component props

## Common Gotchas

1. **UnoCSS Classes**: Must be statically analyzable - no variables in `<script>` blocks
2. **UnoCSS Compatibility**: Some Tailwind classes might not work in UnoCSS - use `npm run check:uno-classes` to verify
3. **i18n**: Never hardcode user-facing strings - always use `m['key']()`
4. **Svelte 5**: Use new runes syntax, not legacy `$:` reactive statements
5. **Context**: UI components often depend on parent context (InputGroup, Select, etc.)
6. **Static Generation**: All data must be available at build time or loaded client-side

## External Dependencies

- **mt-map**: Custom mapping library from GitHub (`github:beam41/mt-map`)
- **OpenLayers**: For advanced map functionality
- **Lottie**: For animations
- **Zod**: For schema validation
