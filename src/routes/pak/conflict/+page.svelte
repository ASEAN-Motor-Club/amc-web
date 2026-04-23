<script lang="ts">
  import { m } from '$messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import MarkdownText from '$lib/ui/MarkdownText/MarkdownText.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Divider from '$lib/ui/Divider/Divider.svelte';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import { Status } from '$lib/utils/status';
  import { filterSubsets } from '$lib/utils/filterSubsets';

  const title = $derived(
    m['pak.conflict.head']({
      siteName: m.site_name_short(),
    }),
  );

  let status: Status = $state(Status.Idle);
  let error: string | null = $state(null);
  let conflicts: string[][] = $state.raw([]);
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
      status = Status.Idle;
      return;
    }

    status = Status.Loading;
    error = null;
    conflicts = [];
    totalPaks = pakFiles.length;

    try {
      const { list } = await import('pakop');

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

      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const pairSet = new Set<string>();
      const pairList: string[][] = [];
      for (const paks of pathMap.values()) {
        if (paks.length > 1) {
          const sorted = [...new Set(paks)].sort();
          const key = sorted.join('\0');
          if (!pairSet.has(key)) {
            pairSet.add(key);
            pairList.push(sorted);
          }
        }
      }

      conflicts = filterSubsets(pairList).sort((a, b) => a[0].localeCompare(b[0]));

      status = Status.Done;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      status = Status.Idle;
    }
  };
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

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
        <Button onClick={handleSelectFolder} disabled={status === Status.Loading}>
          {status === Status.Loading
            ? m['pak.conflict.scanning']()
            : m['pak.conflict.select_folder']()}
        </Button>
        <div class="min-w-0 flex-1">
          <p class="text-text-600 dark:text-text-400 text-sm">{m['pak.conflict.description']()}</p>
          <p class="text-text-500 text-xs">{m['pak.conflict.privacy_note']()}</p>
        </div>
      </div>
      <Divider spacing={false} />

      <!-- Result area -->
      <div class="min-h-0 flex-1 overflow-y-auto p-4">
        {#if error}
          <p class="text-sm text-red-400">{error}</p>
        {:else if status === Status.Loading}
          <p class="text-text-500 mb-3 text-sm">
            {m['pak.conflict.scanning']()}
          </p>
        {:else if status === Status.Done}
          <p class="text-text-500 mb-3 text-sm">
            {m['pak.conflict.scanned']({ count: totalPaks })}
          </p>
          {#if conflicts.length === 0}
            <p class="mb-3 font-semibold text-green-600 dark:text-green-400">
              {m['pak.conflict.no_conflicts']()}
            </p>
          {:else}
            <p class="mb-3 font-semibold text-red-600 dark:text-red-400">
              {m['pak.conflict.found']({ count: conflicts.length })}
            </p>
            <ul
              class="rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            >
              {#each conflicts as conflict (conflict.join('\0'))}
                <li
                  class="flex flex-wrap items-center gap-2 border-b border-gray-100 px-3 py-2 last:border-0 dark:border-gray-800"
                >
                  {#each conflict as pak, i (pak)}
                    <p class="rounded bg-gray-500/10 px-2 py-1 text-xs">
                      {pak}
                    </p>
                    {#if conflict.length >= 2 && i !== conflict.length - 1}
                      <Icon
                        class="i-material-symbols:add-rounded text-gray-400 dark:text-gray-600"
                        size="xs"
                      />
                    {/if}
                  {/each}
                </li>
              {/each}
            </ul>
          {/if}
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
