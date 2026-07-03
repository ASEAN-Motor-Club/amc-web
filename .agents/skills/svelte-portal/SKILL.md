---
name: svelte-portal
description: Overlay/floating UI conventions in the AMC web repo — use svelte-portal (as done in Tooltip and Modal) instead of manual document.body mounting. Read before building modals, tooltips, or popovers.
---

# svelte-portal

- Floating/overlay UI (`Tooltip`, `Modal` in `src/lib/ui/`) renders outside the component tree via **svelte-portal**.
- For any new overlay component (popover, dropdown panel, toast), use svelte-portal — never manually append to `document.body`.
- Prefer reusing/extending the existing `Modal` and `Tooltip` components before writing a new overlay; also see `ClickAwayBlock` for dismiss-on-outside-click behavior.

Related: [[codebase-patterns]], [[project-structure]]
