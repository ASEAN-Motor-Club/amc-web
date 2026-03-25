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
  <div class="flex flex-col items-center">
    <div class="grid grid-cols-[repeat(12,max-content)] items-center gap-4">
      {#each headers as header (header)}
        <div class="justify-self-center text-xs text-gray-500">{header}</div>
      {/each}

      <div class="text-sm text-gray-500">Background</div>
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
        class="grid aspect-1/1 w-6 place-items-center rounded-sm bg-red-50 outline -outline-offset-1 outline-red-400/50 sm:rounded-md dark:bg-red-950/20"
        title="Not defined"
      >
        <span class="text-xs leading-none font-bold text-red-400">✕</span>
      </div>
      <div
        class="grid aspect-1/1 w-6 place-items-center rounded-sm bg-red-50 outline -outline-offset-1 outline-red-400/50 sm:rounded-md dark:bg-red-950/20"
        title="Not defined"
      >
        <span class="text-xs leading-none font-bold text-red-400">✕</span>
      </div>
      <div
        class="grid aspect-1/1 w-6 place-items-center rounded-sm bg-red-50 outline -outline-offset-1 outline-red-400/50 sm:rounded-md dark:bg-red-950/20"
        title="Not defined"
      >
        <span class="text-xs leading-none font-bold text-red-400">✕</span>
      </div>
      <div
        class="grid aspect-1/1 w-6 place-items-center rounded-sm bg-red-50 outline -outline-offset-1 outline-red-400/50 sm:rounded-md dark:bg-red-950/20"
        title="Not defined"
      >
        <span class="text-xs leading-none font-bold text-red-400">✕</span>
      </div>
      <div
        class="grid aspect-1/1 w-6 place-items-center rounded-sm bg-red-50 outline -outline-offset-1 outline-red-400/50 sm:rounded-md dark:bg-red-950/20"
        title="Not defined"
      >
        <span class="text-xs leading-none font-bold text-red-400">✕</span>
      </div>
      <div
        class="bg-background-800 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
      ></div>
      <div
        class="bg-background-900 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
      ></div>
      <div
        class="bg-background-950 aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
      ></div>

      <div class="text-sm text-gray-500">Primary</div>
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

      <div class="col-span-12 border-t border-black/10 dark:border-white/10"></div>

      <div class="text-sm text-gray-500">Accent</div>
      <div
        class="bg-accent aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
      ></div>
      <div class="col-span-10"></div>

      <div class="text-sm text-gray-500">Accent Secondary</div>
      <div
        class="bg-accent-secondary aspect-1/1 w-6 rounded-sm outline -outline-offset-1 outline-black/10 sm:rounded-md dark:outline-white/10"
      ></div>
      <div class="col-span-10"></div>
    </div>

    <ul class="mt-10 w-120 list-disc space-y-1 pl-5 text-xs text-gray-500">
      <li>
        <strong>Background 100</strong> and <strong>Background 950</strong> are the main light and dark
        background colors used as base (body background).
      </li>
      <li>
        <strong>Primary</strong> is the main brand palette (blue), with <strong>Primary 900</strong>
        matching the ASEAN flag blue.
      </li>
      <li>
        <strong>Accent</strong> (red) and <strong>Accent Secondary</strong> (yellow) are single-tone
        colors derived directly from the ASEAN flag. They have no shade palette and should only be
        used for decorative purposes in conjunction with <strong>Primary</strong>.
      </li>
    </ul>
  </div>
</Story>
