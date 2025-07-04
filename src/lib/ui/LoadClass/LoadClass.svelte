<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { ClassValue } from 'svelte/elements';

  export type LoadClassProps = {
    /** CSS class to load, this component is useful to get around Svelte Scoped integration */
    class: ClassValue[];
    /** Children to be rendered, pass the loaded class from here */
    children: Snippet<[ClassValue[]]>;
  };

  const { class: propsClassname, children }: LoadClassProps = $props();
</script>

<div class="hidden">
  <div class={propsClassname}></div>
</div>
{@render children(propsClassname)}
