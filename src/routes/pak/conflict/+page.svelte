<script lang="ts">
  import { m } from '$messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import MarkdownText from '$lib/ui/MarkdownText/MarkdownText.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Divider from '$lib/ui/Divider/Divider.svelte';

  type PakConflict = {
    path: string;
    paks: string[];
  };

  let status: 'idle' | 'loading' | 'done' = $state('idle');
  let error: string | null = $state(null);
  let conflicts: PakConflict[] = $state([]);
  let totalPaks = $state(0);

  let fileInput: HTMLInputElement;

  const handleSelectFolder = () => {
    fileInput.click();
  };

  const handleFolderChange = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const allFiles = Array.from(input.files ?? []);
    input.value = '';

    const pakFiles = allFiles.filter((f) => f.name.endsWith('_P.pak'));
    if (pakFiles.length === 0) {
      error = m['pak.conflict.no_pak_files']();
      status = 'idle';
      return;
    }

    status = 'loading';
    error = null;
    conflicts = [];
    totalPaks = pakFiles.length;

    try {
      const { list } = await import('$lib/wasm/pakop/pakop.js');

      // map: path -> pak file names
      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const pathMap = new Map<string, string[]>();

      for (const file of pakFiles) {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        const paths = list(data);
        for (const p of paths) {
          const entry = pathMap.get(p);
          if (entry) {
            entry.push(file.name);
          } else {
            pathMap.set(p, [file.name]);
          }
        }
      }

      conflicts = Array.from(pathMap.entries())
        .filter(([, paks]) => paks.length > 1)
        .map(([path, paks]) => ({ path, paks }))
        .sort((a, b) => a.path.localeCompare(b.path));

      status = 'done';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      status = 'idle';
    }
  };
</script>

<div class="flex h-full w-full p-8">
  <div class="relative flex h-full w-full flex-col items-center">
    <h1 class="mt-2 mb-10 text-4xl font-bold tracking-tight">
      {m['pak.conflict.title']()}
    </h1>

    <input
      type="file"
      class="hidden"
      bind:this={fileInput}
      onchange={handleFolderChange}
      webkitdirectory
      multiple
    />

    <Card class="flex w-full max-w-4xl flex-1 flex-col overflow-hidden p-0">
      <!-- Top bar: button + description/status -->
      <div class="flex shrink-0 items-center gap-4 p-4">
        <Button onClick={handleSelectFolder} disabled={status === 'loading'}>
          {status === 'loading' ? m['pak.conflict.scanning']() : m['pak.conflict.select_folder']()}
        </Button>
        <div class="min-w-0 flex-1">
          <p class="text-text-400 text-sm">{m['pak.conflict.description']()}</p>
          <p class="text-text-500 text-xs">{m['pak.conflict.privacy_note']()}</p>
        </div>
      </div>
      <Divider spacing={false} />

      <!-- Result area -->
      <div class="min-h-0 flex-1 overflow-y-auto p-4">
        {#if error}
          <p class="text-sm text-red-400">{error}</p>
        {:else if status === 'loading'}
          <p class="text-text-500 flex h-full items-center justify-center text-sm">
            {m['pak.conflict.scanning']()}
          </p>
        {:else if status === 'done'}
          <p class="text-text-500 mb-3 text-sm">
            {m['pak.conflict.scanned']({ count: totalPaks })}
          </p>
          {#if conflicts.length === 0}
            <p class="flex h-full items-center justify-center text-lg font-semibold text-green-500">
              {m['pak.conflict.no_conflicts']()}
            </p>
          {:else}
            <p class="mb-3 font-semibold text-red-400">
              {m['pak.conflict.found']({ count: conflicts.length })}
            </p>
            <ul class="rounded border border-gray-700 bg-gray-900">
              {#each conflicts as conflict (conflict.path)}
                <li class="border-b border-gray-800 px-3 py-2 last:border-0">
                  <p class="font-mono text-xs text-white">{conflict.path}</p>
                  <p class="mt-0.5 font-mono text-xs text-gray-400">
                    {conflict.paks.join(', ')}
                  </p>
                </li>
              {/each}
            </ul>
          {/if}
        {/if}
      </div>
    </Card>

    <p class="text-text-400 mt-3 w-full max-w-4xl text-right text-xs [&_a]:underline">
      <MarkdownText text={m['pak.conflict.repak_credit']()} noSanitize textOnly />
    </p>
  </div>
</div>
