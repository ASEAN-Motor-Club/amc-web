---
name: path-aliases
description: Import path aliases ($lib, $messages) and workspace packages used in the AMC web repo. Read when writing imports or resolving where a module comes from.
---

# Path Aliases & Workspace Packages

## SvelteKit aliases

| Alias       | Resolves to                  | Notes                                                    |
| ----------- | ---------------------------- | -------------------------------------------------------- |
| `$lib`      | `src/lib`                    | SvelteKit default                                        |
| `$messages` | `src/lib/paraglide/messages` | Custom alias defined in `svelte.config.js` (`kit.alias`) |
| `$app/*`    | SvelteKit runtime modules    | e.g. `$app/state`, `$app/navigation`                     |

Always import i18n messages via the alias:

```ts
import { m } from '$messages';
```

Do **not** import from `$lib/paraglide/messages` directly — the codebase consistently uses `$messages`.

## Workspace packages

- `pakop` — the Rust WASM crate at `wasm/pakop/`, published into the pnpm workspace from its `pkg/` output directory (`pakop: workspace:*` in `package.json`). Import it lazily: `const { list_hash } = await import('pakop');`
- `amc-uno-css-config` — shared UnoCSS config, pinned to a commit of `ASEAN-Motor-Club/uno-css-config` on GitHub (not part of this repo).

Related: [[architecture]], [[project-structure]]
