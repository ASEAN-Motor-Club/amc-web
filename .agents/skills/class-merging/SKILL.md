---
name: class-merging
description: CSS class-prop handling in the AMC web repo — the clsx + tailwind-merge pattern for merging component class props. Read before adding a class prop to a component.
---

# Class Merging (clsx + tailwind-merge)

Standard pattern for every component that accepts a `class` prop:

```svelte
<script lang="ts">
  import clsx from 'clsx';
  import type { ClassValue } from 'svelte/elements';
  import { twMerge } from 'tailwind-merge';

  const { class: propsClass }: { class?: ClassValue } = $props();
</script>

<div class={twMerge('base-classes here', clsx(propsClass))}></div>
```

- Type the prop as `ClassValue` from `svelte/elements` (accepts strings, arrays, objects).
- `clsx` flattens the `ClassValue`; `twMerge` resolves Tailwind/UnoCSS conflicts so caller classes win over component defaults.
- Never concatenate class strings manually or let duplicate utilities collide — always this combo.

Related: [[codebase-patterns]]
