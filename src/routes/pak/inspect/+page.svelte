<script lang="ts">
  let files: string[] = $state([]);
  let error: string | null = $state(null);
  let loading = $state(false);

  async function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    loading = true;
    error = null;
    files = [];

    try {
      const buffer = await file.arrayBuffer();
      const data = new Uint8Array(buffer);

      const { list } = await import('$lib/wasm/pakop/pakop.js');
      files = list(data);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }
</script>

<div class="mx-auto max-w-4xl p-6">
  <h1 class="mb-4 text-2xl font-bold">Pak File Inspector</h1>

  <label class="mb-6 block">
    <span class="mb-1 block text-sm font-medium">Upload a .pak file</span>
    <input
      type="file"
      accept=".pak"
      onchange={handleFileChange}
      class="block w-full cursor-pointer rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm"
    />
  </label>

  {#if loading}
    <p class="text-gray-400">Parsing…</p>
  {:else if error}
    <p class="rounded bg-red-900/40 px-3 py-2 text-red-400">Error: {error}</p>
  {:else if files.length > 0}
    <p class="mb-2 text-sm text-gray-400">{files.length} files found</p>
    <ul class="max-h-[70vh] overflow-y-auto rounded border border-gray-700 bg-gray-900">
      {#each files as path (path)}
        <li class="border-b border-gray-800 px-3 py-1 font-mono text-xs last:border-0">{path}</li>
      {/each}
    </ul>
  {/if}
</div>
