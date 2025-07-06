<script module>
  import { defineMeta } from '@storybook/addon-svelte-csf';

  // More on how to set up stories at: https://storybook.js.org/docs/writing-stories
  const { Story } = defineMeta({
    title: 'Reference/Color',
    tags: ['autodocs'],
  });

  const headers = ['', 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
</script>

<Story name="Default" asChild>
  <div class="grid grid-cols-[repeat(12,max-content)] items-center gap-4">
    {#each headers as header (header)}
      <div class="justify-self-center text-xs">{header}</div>
    {/each}

    <div class="text-sm">Background</div>
    <div
      class="bg-background-50 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-background-100 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-background-200 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-background-300 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-background-400 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-background-500 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-background-600 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-background-700 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-background-800 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-background-900 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-background-950 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>

    <div class="text-sm">Primary</div>
    <div
      class="bg-primary-50 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-primary-100 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-primary-200 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-primary-300 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-primary-400 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-primary-500 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-primary-600 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-primary-700 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-primary-800 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-primary-900 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-primary-950 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>

    <div class="text-sm">Secondary</div>
    <div
      class="bg-secondary-50 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-secondary-100 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-secondary-200 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-secondary-300 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-secondary-400 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-secondary-500 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-secondary-600 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-secondary-700 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-secondary-800 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-secondary-900 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-secondary-950 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>

    <div class="text-sm">Info</div>
    <div
      class="bg-info-50 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-info-100 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-info-200 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-info-300 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-info-400 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-info-500 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-info-600 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-info-700 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-info-800 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-info-900 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-info-950 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>

    <div class="text-sm">Success</div>
    <div
      class="bg-success-50 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-success-100 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-success-200 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-success-300 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-success-400 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-success-500 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-success-600 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-success-700 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-success-800 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-success-900 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-success-950 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>

    <div class="text-sm">Warning</div>
    <div
      class="bg-warning-50 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-warning-100 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-warning-200 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-warning-300 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-warning-400 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-warning-500 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-warning-600 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-warning-700 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-warning-800 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-warning-900 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-warning-950 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>

    <div class="text-sm">Error</div>
    <div
      class="bg-error-50 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-error-100 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-error-200 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-error-300 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-error-400 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-error-500 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-error-600 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-error-700 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-error-800 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-error-900 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
    <div
      class="bg-error-950 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
    ></div>
  </div>
</Story>
