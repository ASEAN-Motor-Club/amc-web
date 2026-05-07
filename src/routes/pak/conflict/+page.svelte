<script lang="ts">
  import '@fontsource-variable/noto-sans-mono';
  import { m } from '$messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import MarkdownText from '$lib/ui/MarkdownText/MarkdownText.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Divider from '$lib/ui/Divider/Divider.svelte';
  import { Status } from '$lib/utils/status';
  import mappings from '$lib/assets/mappings/Mappings718.usmap?url';
  import ExpandableRows from './ExpandableRows.svelte';

  interface ConflictEntry {
    pak: string;
    raw_path: string;
    path: string;
    hash: string;
    rows?: string[];
  }
  interface Conflict {
    path: string;
    entries: ConflictEntry[];
  }

  const title = $derived(
    m['pak.conflict.head']({
      siteName: m.site_name_short(),
    }),
  );

  let status: Status = $state(Status.Idle);
  let error: string | null = $state(null);
  let conflicts: Conflict[] = $state.raw([]);
  let totalPaks = $state(0);
  let mode: 'summary' | 'details' = $state('summary');

  interface ConflictGroup {
    paks: string[];
    count: number;
  }

  const summary = $derived.by(() => {
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const map = new Map<string, ConflictGroup>();
    for (const conflict of conflicts) {
      const paks = conflict.entries.map((e) => e.pak);
      const key = paks.join('\0');
      const existing = map.get(key);
      if (existing) existing.count++;
      else map.set(key, { paks, count: 1 });
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  });

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
      const { list_hash, get_datatables_names } = await import('pakop');

      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const pathMap = new Map<string, ConflictEntry[]>();
      // eslint-disable-next-line svelte/prefer-svelte-reactivity
      const pakDataMap = new Map<string, Uint8Array>();

      for (const file of pakFiles) {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);
        pakDataMap.set(file.name, data);
        const entries = list_hash(data, true);
        for (const entry of entries) {
          const item: ConflictEntry = {
            pak: file.name,
            raw_path: entry.raw_path,
            path: entry.path,
            hash: entry.hash,
          };
          const existing = pathMap.get(entry.path);
          if (existing) {
            existing.push(item);
          } else {
            pathMap.set(entry.path, [item]);
          }
        }
      }

      let mappingData: Uint8Array | null = null;

      const result: Conflict[] = [];
      for (const [path, entries] of pathMap) {
        const uniqueHashes = new Set(entries.map((e) => e.hash));
        if (entries.length <= 1 || uniqueHashes.size <= 1) continue;

        // For uassets, check datatable row subsets before treating as a conflict
        if (path.endsWith('.uasset')) {
          try {
            if (!mappingData) {
              mappingData = new Uint8Array(await (await fetch(mappings)).arrayBuffer());
            }

            // Sort by pak name; last pak is authoritative
            const sortedEntries = [...entries].sort((a, b) => a.pak.localeCompare(b.pak));
            const lastEntry = sortedEntries[sortedEntries.length - 1];
            const lastPakData = pakDataMap.get(lastEntry.pak);
            if (!lastPakData) throw new Error('missing data');
            const md = mappingData; // narrowed: confirmed non-null above
            const lastTable = get_datatables_names(lastPakData, lastEntry.raw_path, md);
            console.log('table for', lastEntry.pak, lastEntry.raw_path, lastTable);
            const lastSet = new Set(lastTable);

            const annotated = sortedEntries.map((e, i) => {
              if (i === sortedEntries.length - 1) return { ...e };
              const pakData = pakDataMap.get(e.pak);
              if (!pakData) throw new Error('missing data');
              const table = get_datatables_names(pakData, e.raw_path, md);
              console.log('table for', e.pak, e.raw_path, table);
              const extra = table.filter((row) => !lastSet.has(row));
              return { ...e, rows: extra.length > 0 ? extra : undefined };
            });

            if (annotated.every((e) => !e.rows)) continue;

            result.push({ path, entries: annotated });
            continue;
          } catch {
            // fall through to hash-based conflict
          }
        }

        result.push({ path, entries: [...entries].sort((a, b) => a.pak.localeCompare(b.pak)) });
      }

      conflicts = result.sort((a, b) => a.path.localeCompare(b.path));

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
            <div class="mb-3 flex items-center justify-between">
              <p class="font-semibold text-red-600 dark:text-red-400">
                {m['pak.conflict.found']({ count: conflicts.length })}
              </p>
              <div class="flex rounded border border-gray-300 text-xs dark:border-gray-600">
                <button
                  class={[
                    'px-2 py-1',
                    mode === 'summary'
                      ? 'bg-gray-200 dark:bg-gray-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800',
                  ]}
                  onclick={() => (mode = 'summary')}>{m['pak.conflict.summary']()}</button
                >
                <button
                  class={[
                    'border-l border-gray-300 px-2 py-1 dark:border-gray-600',
                    mode === 'details'
                      ? 'bg-gray-200 dark:bg-gray-700'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800',
                  ]}
                  onclick={() => (mode = 'details')}>{m['pak.conflict.details']()}</button
                >
              </div>
            </div>

            {#if mode === 'summary'}
              <ul
                class="rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
              >
                {#each summary as group (group.paks.join('\0'))}
                  <li
                    class="flex items-center gap-2 border-b border-gray-100 px-3 py-2 last:border-0 dark:border-gray-800"
                  >
                    <span class="text-text-500 shrink-0 font-mono text-xs"
                      >{group.count} file{group.count !== 1 ? 's' : ''}</span
                    >
                    <div class="flex flex-wrap gap-1">
                      {#each group.paks as pak, i (pak)}
                        <span class="shrink-0 rounded bg-gray-500/10 px-2 py-0.5 font-mono text-xs"
                          >{pak}</span
                        >
                        {#if i < group.paks.length - 1}
                          <span class="text-text-400 text-xs">+</span>
                        {/if}
                      {/each}
                    </div>
                  </li>
                {/each}
              </ul>
            {:else}
              <ul
                class="rounded border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
              >
                {#each conflicts as conflict (conflict.path)}
                  <li class="border-b border-gray-100 px-3 py-2 last:border-0 dark:border-gray-800">
                    <p class="mb-1 font-mono text-xs text-gray-500 dark:text-gray-400">
                      {conflict.path}
                      {#if conflict.entries.some((e) => e.rows !== undefined)}
                        <span
                          class="rounded bg-blue-500/10 px-1.5 py-0.5 text-[0.625rem] text-blue-700 dark:text-blue-400"
                          >DataTable</span
                        >
                      {/if}
                    </p>
                    <div class="flex flex-col gap-1">
                      {#each conflict.entries as entry, i (entry.pak)}
                        <div class="flex flex-col font-mono text-xs">
                          <div class="flex gap-2 py-0.5">
                            <span class="-my-0.5 shrink-0 rounded bg-gray-500/10 px-2 py-0.5"
                              >{entry.pak}</span
                            >
                            {#if i === conflict.entries.length - 1}
                              <span class="text-text-600 dark:text-text-400"
                                >{m['pak.conflict.loaded']()}</span
                              >
                            {/if}
                            <span class="text-text-500 ml-auto shrink-0" title={entry.hash}
                              >{entry.hash.substring(0, 7)}</span
                            >
                          </div>
                          {#if entry.rows}
                            <ExpandableRows rows={entry.rows} />
                          {/if}
                        </div>
                      {/each}
                    </div>
                  </li>
                {/each}
              </ul>
            {/if}
          {/if}
        {/if}
      </div>
    </Card>

    <div
      class="text-text-600 dark:text-text-400 mt-3 w-full max-w-4xl text-right text-xs [&_a]:underline"
    >
      <MarkdownText text={m['pak.conflict.repak_credit']()} noSanitize textOnly />
    </div>
  </div>
</div>
