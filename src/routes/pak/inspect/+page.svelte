<script lang="ts">
  import '@fontsource-variable/noto-sans-mono';
  import { m } from '#messages';
  import Button from '#lib/ui/Button/Button.svelte';
  import Card from '#lib/ui/Card/Card.svelte';
  import Divider from '#lib/ui/Divider/Divider.svelte';
  import { MarkdownText } from '#lib/ui/MarkdownText/index.ts';
  import { Status } from '#lib/utils/status.ts';
  import mappings from '#lib/assets/mappings/Mappings718.usmap?url';

  const title = $derived(
    m['pak.inspect.head']({
      siteName: m.site_name_short(),
    }),
  );

  let status: Status = $state(Status.Idle);
  let error: string | null = $state(null);
  let files: { raw_path: string; path: string; hash: string }[] = $state.raw([]);
  let pakData: Uint8Array | null = null;

  let fileInput: HTMLInputElement;

  const handleSelectFile = () => {
    fileInput.click();
  };

  const handleInspectFile = async (rawPath: string) => {
    if (!pakData) return;
    const [{ print_exports }, mappingRes] = await Promise.all([import('pakop'), fetch(mappings)]);
    const mappingData = new Uint8Array(await mappingRes.arrayBuffer());
    print_exports(pakData, rawPath, mappingData);
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

      const { list_hash } = await import('pakop');
      pakData = data;
      files = list_hash(data, false);
      status = Status.Done;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      status = Status.Idle;
    }
  };
</script>

<svelte:head>
  <title>{title}</title>
  <meta property="og:title" content={title} />
  <meta name="twitter:title" content={title} />
</svelte:head>

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
          <p class="text-sm text-text-600 dark:text-text-400">{m['pak.inspect.description']()}</p>
          <p class="text-xs text-text-500">{m['pak.inspect.privacy_note']()}</p>
        </div>
      </div>
      <Divider spacing={false} />

      <!-- Result area -->
      <div class="min-h-0 flex-1 overflow-y-auto p-4">
        {#if error}
          <p class="text-sm text-red-400">{error}</p>
        {:else if status === Status.Loading}
          <p class="flex h-full items-center justify-center text-sm text-text-500">
            {m['pak.inspect.parsing']()}
          </p>
        {:else if status === Status.Done}
          <p class="mb-3 text-sm text-text-500">
            {m['pak.inspect.files_found']({ count: files.length })}
          </p>
          <ul
            class="rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
          >
            {#each files as f (f.path + f.hash)}
              <li class="border-b border-gray-100 last:border-0 dark:border-gray-800">
                <button
                  type="button"
                  class="w-full cursor-pointer px-3 py-1 text-left font-mono text-xs hover:bg-gray-500/10"
                  onclick={() => handleInspectFile(f.raw_path)}
                >
                  {f.path}
                  <br />
                  <span class="text-[0.625rem] text-text-600 dark:text-text-400">{f.hash}</span>
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </Card>
    <div
      class="mt-3 w-full max-w-4xl text-right text-xs text-text-600 dark:text-text-400 [&_a]:underline"
    >
      <MarkdownText text={m['pak.conflict.repak_credit']()} noSanitize textOnly />
    </div>
  </div>
</div>
