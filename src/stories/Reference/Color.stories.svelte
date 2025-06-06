<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';

  // More on how to set up stories at: https://storybook.js.org/docs/writing-stories
  const { Story } = defineMeta({
    title: 'Reference/Color',
    tags: ['autodocs'],
  });

  const colors = [
    'primary',
    `bg-primary-50`,
    `bg-primary-100`,
    `bg-primary-200`,
    `bg-primary-300`,
    `bg-primary-400`,
    `bg-primary-500`,
    `bg-primary-600`,
    `bg-primary-700`,
    `bg-primary-800`,
    `bg-primary-900`,
    `bg-primary-950`,

    'secondary',
    `bg-secondary-50`,
    `bg-secondary-100`,
    `bg-secondary-200`,
    `bg-secondary-300`,
    `bg-secondary-400`,
    `bg-secondary-500`,
    `bg-secondary-600`,
    `bg-secondary-700`,
    `bg-secondary-800`,
    `bg-secondary-900`,
    `bg-secondary-950`,
  ];
</script>

<Story name="Default" asChild>
  <div class="grid grid-cols-[repeat(12,max-content)] items-center gap-4">
    {#each colors as color, i}
      {#if i % 12 === 0}
        <div class="text-sm text-neutral-500">{color}</div>
      {:else}
        <div
          class={[
            'aspect-1/1 w-5 justify-self-center rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10',
            color,
          ]}
        ></div>
      {/if}
    {/each}
  </div>
</Story>
