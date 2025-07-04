<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';
  import Empty from '../Empty/Empty.svelte';

  export type LoadClassProps = {
    /** CSS class to load, this component is useful to get around Svelte Scoped integration */
    class: ClassValue[];
    /** Children to be rendered, pass the loaded class from here */
    children: Snippet<[ClassValue[]]>;
  };

  const { class: propsClassname, children }: LoadClassProps = $props();
</script>

<Empty class={propsClassname} />

{@render children(propsClassname)}
