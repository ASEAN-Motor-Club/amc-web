<script lang="ts">
  import { m } from '$messages';

  interface Props {
    rows: string[];
  }

  const { rows }: Props = $props();

  let expanded = $state(false);
  let overflows = $state(false);
  let container: HTMLDivElement;

  $effect(() => {
    // Temporarily remove height cap to measure full height
    container.style.height = 'auto';
    overflows = container.scrollHeight > 20;
    container.style.height = '';
  });
</script>

<div class="ml-2 border-l-2 border-gray-500/10 px-2 py-0.5">
  <div class="text-text-500 mb-1 text-[0.625rem]">{m['pak.conflict.entry_missing']()}</div>
  <div bind:this={container} class={['flex flex-wrap gap-1 overflow-hidden', !expanded && 'h-5']}>
    {#each rows as row, i (i)}
      <span
        class="rounded bg-amber-500/10 px-1.5 py-0.5 text-[0.625rem] text-amber-700 dark:text-amber-400"
        >{row}</span
      >
    {/each}
  </div>
  {#if overflows}
    <button
      class="text-text-500 mt-1 inline text-[0.625rem] hover:underline"
      onclick={() => (expanded = !expanded)}
    >
      {expanded ? m['pak.conflict.show_less']() : m['pak.conflict.show_more']()}
    </button>
  {/if}
</div>
