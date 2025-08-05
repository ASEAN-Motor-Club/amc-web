<script lang="ts">
  import { m as msg } from '$lib/paraglide/messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import { onMount } from 'svelte';
  import { trackSchema, type Track } from '$lib/schema/track';
  import type { ChangeEventHandler } from 'svelte/elements';
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import { page } from '$app/state';
  import Modal from '$lib/ui/Modal/Modal.svelte';
  import { noop } from 'lodash-es';
  import { PUBLIC_PROXY_URL } from '$env/static/public';

  export type SelectTrackProps = {
    onSelect: (trackData: Track) => void;
  };

  const { onSelect }: SelectTrackProps = $props();

  const { showModal } = getMsgModalContext();

  const parseTrackData = (text: string) => {
    try {
      const trackData = JSON.parse(text) as unknown;
      const validate = trackSchema.safeParse(trackData);
      if (!validate.success) {
        showModal({
          title: msg['track_editor.select_track.error.title'](),
          message:
            msg['track_editor.select_track.error.invalid_track']() +
            `\n${validate.error.issues.map((issue) => issue.message).join('\n')}`,
        });
      } else {
        onSelect(validate.data);
      }
    } catch (error) {
      console.error('Error parsing track data:', error);
      showModal({
        title: msg['track_editor.select_track.error.title'](),
        message: msg['track_editor.select_track.error.load_error'](),
      });
    }
  };

  const loadFromDataList = async (dataList: DataTransferItemList | undefined) => {
    if (!dataList || !dataList.length) return;
    const item = dataList[0];
    if (!item) return;
    if (item.kind === 'file') {
      const file = item.getAsFile();
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          parseTrackData(e.target?.result as string);
        };
        reader.readAsText(file);
      }
    } else if (item.kind === 'string') {
      item.getAsString((text) => {
        parseTrackData(text);
      });
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    loadFromDataList(items);
  };

  let dragOver = $state(false);
  const handleDragEnter = (event: DragEvent) => {
    event.preventDefault();
    dragOver = true;
  };

  const handleDragLeave = (event: DragEvent) => {
    event.preventDefault();
    dragOver = false;
  };

  const handleDrop = (event: DragEvent) => {
    event.preventDefault();
    dragOver = false;
    const items = event.dataTransfer?.items;
    loadFromDataList(items);
  };

  const handleLoadFromClipboard = async () => {
    const clipboard = await navigator.clipboard.readText();
    if (!clipboard) {
      showModal({
        title: msg['track_editor.select_track.error.title'](),
        message: msg['track_editor.select_track.error.clipboard_empty'](),
      });
      return;
    }
    parseTrackData(clipboard);
  };

  let fileInput: HTMLInputElement;

  const handleSelectFileClick = () => {
    fileInput.click();
  };

  const handleFileChange: ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.currentTarget.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        parseTrackData(e.target?.result as string);
      };
      reader.readAsText(file);
    }
    fileInput.value = '';
  };

  const tryFetchTrack = async (uri: string, signal: AbortSignal) => {
    try {
      const response = await fetch(uri, { signal: signal });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.text();
    } catch (error) {
      if (signal.aborted) {
        return;
      }
      console.error('Error loading track data:', error);
      showModal({
        title: msg['track_editor.select_track.error.cannot_load_track'](),
        message: msg['track_editor.select_track.error.cannot_load_track_desc'](),
      });
    }
  };

  let fetchFromUri = $state(false);

  onMount(() => {
    const abortController = new AbortController();

    const uri = page.url.searchParams.get('uri');
    if (!uri) return;
    fetchFromUri = true;
    const proxiedUri = `${PUBLIC_PROXY_URL}?url=${encodeURIComponent(uri)}`;
    tryFetchTrack(proxiedUri, abortController.signal).then((trackData) => {
      if (trackData) {
        parseTrackData(trackData);
      }
      fetchFromUri = false;
    });

    return () => {
      abortController.abort();
    };
  });
</script>

<svelte:document onpaste={handlePaste} />

<div class="flex h-full w-full p-8">
  <Modal
    open={fetchFromUri}
    onClose={noop}
    class="text-text-dark bg-black/50 text-xl font-semibold"
  >
    {msg['track_editor.select_track.loading_track']()}
  </Modal>
  <div
    class={[
      'rounded-4xl before:z-1000 relative flex h-full w-full flex-col items-center justify-center overflow-hidden border-8 border-dotted border-black/10 p-8 transition-all before:absolute before:inset-0 before:bg-black/20 dark:border-white/10 before:dark:bg-white/20',
      {
        'border-solid ': dragOver,
        'before:hidden': !dragOver,
      },
    ]}
    role="region"
    ondragover={handleDragEnter}
    ondragleave={handleDragLeave}
    ondrop={handleDrop}
  >
    <h1 class="mb-10 text-center text-6xl font-bold tracking-tight">
      {msg['track_editor.title']()}
    </h1>
    <p class="text-text/80 dark:text-text-dark/80 flex items-center">
      {msg['track_editor.select_track.drag_drop']()}
    </p>
    <p class="text-text/60 dark:text-text-dark/60 my-4 text-sm leading-none">
      {msg.or()}
    </p>
    <Button onClick={handleLoadFromClipboard}>
      {msg['track_editor.select_track.load_from_clipboard']()}
    </Button>

    <p class="text-text/60 dark:text-text-dark/60 my-4 text-sm leading-none">
      {msg.or()}
    </p>
    <Button onClick={handleSelectFileClick}>
      {msg['track_editor.select_track.select_file']()}
    </Button>
    <input
      type="file"
      accept="application/json,text/plain"
      class="hidden"
      bind:this={fileInput}
      onchange={handleFileChange}
    />
  </div>
</div>
