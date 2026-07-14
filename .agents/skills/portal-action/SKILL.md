---
name: portal-action
description: Overlay/floating UI conventions in the AMC web repo — use the homegrown `portal` action from $lib/utils/portal (svelte-portal package is not used/dependency), as done in Tooltip and Modal. Read before building modals, tooltips, or popovers.
---

# portal action

- Floating/overlay UI (`Tooltip`, `Modal` in `src/lib/ui/`) renders outside the component tree via the `portal` Svelte action at `src/lib/utils/portal.ts`, used as `use:portal={'body'}` or `use:portal={someElement}`.
- This replaces the old `svelte-portal` npm package, which predates Svelte 5 and has no Svelte 5-specific release — it is **not** a dependency of this repo. Don't reach for it or reintroduce it.
- For any new overlay component (popover, dropdown panel, toast), use `use:portal` — never manually append to `document.body`.
- Prefer reusing/extending the existing `Modal` and `Tooltip` components before writing a new overlay; also see `ClickAwayBlock` for dismiss-on-outside-click behavior.

Related: [[codebase-patterns]], [[project-structure]]
