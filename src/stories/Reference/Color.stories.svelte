<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';

  // More on how to set up stories at: https://storybook.js.org/docs/writing-stories
  const { Story } = defineMeta({
    title: 'Reference/Color',
    tags: ['autodocs'],
  });

  const headers = ['', 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

  const colors = [
    'Background',
    `bg-background-50`,
    `bg-background-100`,
    `bg-background-200`,
    `bg-background-300`,
    `bg-background-400`,
    `bg-background-500`,
    `bg-background-600`,
    `bg-background-700`,
    `bg-background-800`,
    `bg-background-900`,
    `bg-background-950`,

    'Primary',
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

    'Secondary',
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

    'Info',
    `bg-info-50`,
    `bg-info-100`,
    `bg-info-200`,
    `bg-info-300`,
    `bg-info-400`,
    `bg-info-500`,
    `bg-info-600`,
    `bg-info-700`,
    `bg-info-800`,
    `bg-info-900`,
    `bg-info-950`,

    'Success',
    `bg-success-50`,
    `bg-success-100`,
    `bg-success-200`,
    `bg-success-300`,
    `bg-success-400`,
    `bg-success-500`,
    `bg-success-600`,
    `bg-success-700`,
    `bg-success-800`,
    `bg-success-900`,
    `bg-success-950`,

    'Warning',
    `bg-warning-50`,
    `bg-warning-100`,
    `bg-warning-200`,
    `bg-warning-300`,
    `bg-warning-400`,
    `bg-warning-500`,
    `bg-warning-600`,
    `bg-warning-700`,
    `bg-warning-800`,
    `bg-warning-900`,
    `bg-warning-950`,

    'Error',
    `bg-error-50`,
    `bg-error-100`,
    `bg-error-200`,
    `bg-error-300`,
    `bg-error-400`,
    `bg-error-500`,
    `bg-error-600`,
    `bg-error-700`,
    `bg-error-800`,
    `bg-error-900`,
    `bg-error-950`,
  ];
</script>

<Story name="Default" asChild>
  <div class="grid grid-cols-[repeat(12,max-content)] items-center gap-4">
    {#each headers as header}
      <div class="justify-self-center text-xs">{header}</div>
    {/each}
    {#each colors as color, i}
      {#if i % 12 === 0}
        <div class="text-sm">{color}</div>
      {:else}
        <div
          class={[
            'aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10',
            color,
          ]}
        ></div>
      {/if}
    {/each}
  </div>
</Story>
