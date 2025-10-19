<script lang="ts">
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import { m as msg } from '$lib/paraglide/messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import type { Track } from '$lib/schema/track';

  interface Props {
    edited: boolean;
    initialTrackData: Track;
    trackData: Track;
  }

  const { edited, initialTrackData, trackData }: Props = $props();

  const { showModal } = getMsgModalContext();

  let downloadOriginal = $state(false);

  const downloadData = $derived(downloadOriginal ? initialTrackData : trackData);

  const getJson = () => {
    return JSON.stringify(downloadData, null, 2);
  };

  const handleClipboardClick = () => {
    const downloadJson = getJson();
    navigator.clipboard
      .writeText(downloadJson)
      .then(() => {
        showModal({
          title: msg['track_editor.editor.copied.title'](),
          message: msg['track_editor.editor.copied.desc'](),
        });
      })
      .catch((err: unknown) => {
        console.error('Failed to copy:', err);
        showModal({
          title: msg['track_editor.editor.copy_to_clipboard_failed.title'](),
          message: msg['track_editor.editor.copy_to_clipboard_failed.desc'](),
        });
      });
  };

  const handleFileDownloadClick = () => {
    const downloadJson = getJson();
    const blob = new Blob([downloadJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement('a');
      a.href = url;
      a.download = (downloadData.routeName.trim() || 'track_updated') + '.json';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } finally {
      URL.revokeObjectURL(url);
    }
  };
</script>

<Card class="flex flex-col">
  <div class="mb-2 flex items-center justify-between gap-1">
    <div class="font-medium">
      {msg['track_editor.editor.download_title']({
        file:
          !edited || downloadOriginal
            ? msg['track_editor.editor.original']()
            : msg['track_editor.editor.edited'](),
      })}
    </div>
    {#if edited}
      <Button
        onClick={() => (downloadOriginal = !downloadOriginal)}
        size="xs"
        variant="text"
        color="primary"
        class="-mr-1.5"
      >
        {msg['track_editor.editor.change_btn']({
          file: downloadOriginal
            ? msg['track_editor.editor.edited']()
            : msg['track_editor.editor.original'](),
        })}
      </Button>
    {/if}
  </div>

  <div class="flex gap-3">
    <Button class="flex-1" onClick={handleClipboardClick}
      >{msg['track_editor.editor.clipboard']()}</Button
    >
    <Button class="flex-1" onClick={handleFileDownloadClick}
      >{msg['track_editor.editor.file']()}</Button
    >
  </div>
</Card>
