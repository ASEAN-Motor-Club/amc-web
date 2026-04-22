<script lang="ts">
  import { m } from '$messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Divider from '$lib/ui/Divider/Divider.svelte';
  import { MarkdownText } from '$lib/ui/MarkdownText';
  import { Status } from '$lib/utils/status';

  let status: Status = $state(Status.Idle);
  let error: string | null = $state(null);
  let files: string[] = $state.raw([]);

  let fileInput: HTMLInputElement;

  const handleSelectFile = () => {
    fileInput.click();
  };

  const handleFileChange = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    status = Status.Loading;
    error = null;
    files = [];

    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);

      const { list } = await import('$lib/wasm/pakop/pakop.js');
      files = list(data);
      status = Status.Done;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      status = Status.Idle;
    }
  };
</script>

<div class="flex h-full w-full p-8">
  <div class="relative flex h-full w-full flex-col items-center">
    <h1 class="mt-2 mb-10 text-4xl font-bold tracking-tight">
      {m['pak.inspect.title']()}
    </h1>

    <input
      type="file"
      accept=".pak"
      class="hidden"
      bind:this={fileInput}
      onchange={handleFileChange}
    />

    <Card class="flex w-full max-w-4xl flex-1 flex-col overflow-hidden p-0">
      <!-- Top bar: button + description -->
      <div class="flex shrink-0 items-center gap-4 p-4">
        <Button onClick={handleSelectFile} disabled={status === Status.Loading}>
          {status === Status.Loading ? m['pak.inspect.parsing']() : m['pak.inspect.select_file']()}
        </Button>
        <div class="min-w-0 flex-1">
          <p class="text-text-600 dark:text-text-400 text-sm">{m['pak.inspect.description']()}</p>
          <p class="text-text-500 text-xs">{m['pak.inspect.privacy_note']()}</p>
        </div>
      </div>
      <Divider spacing={false} />

      <!-- Result area -->
      <div class="min-h-0 flex-1 overflow-y-auto p-4">
        {#if error}
          <p class="text-sm text-red-400">{error}</p>
        {:else if status === Status.Loading}
          <p class="text-text-500 flex h-full items-center justify-center text-sm">
            {m['pak.inspect.parsing']()}
          </p>
        {:else if status === Status.Done}
          <p class="text-text-500 mb-3 text-sm">
            {m['pak.inspect.files_found']({ count: files.length })}
          </p>
          <ul
            class="rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
          >
            {#each files as path (path)}
              <li
                class="border-b border-gray-100 px-3 py-1 font-mono text-xs last:border-0 dark:border-gray-800"
              >
                {path}
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </Card>
    <p
      class="text-text-600 dark:text-text-400 mt-3 w-full max-w-4xl text-right text-xs [&_a]:underline"
    >
      <MarkdownText text={m['pak.conflict.repak_credit']()} noSanitize textOnly />
    </p>
  </div>
</div>
