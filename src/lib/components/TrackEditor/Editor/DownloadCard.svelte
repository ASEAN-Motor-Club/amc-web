<script lang="ts">
  import { getMsgModalContext } from '$lib/components/MsgModal/context';
  import { m } from '$lib/paraglide/messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import type { TrackData } from '../types';

  type Props = {
    edited: boolean;
    initialTrackData: TrackData;
    trackData: TrackData;
  };

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
          title: m['track_editor.editor.copied.title'](),
          message: m['track_editor.editor.copied.desc'](),
        });
      })
      .catch((err) => {
        console.error('Failed to copy:', err);
        showModal({
          title: m['track_editor.editor.copy_to_clipboard_failed.title'](),
          message: m['track_editor.editor.copy_to_clipboard_failed.desc'](),
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
      a.download = (downloadData.routeName?.trim() || 'track_updated') + '.json';
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
      {m['track_editor.editor.download_title']({
        file: downloadOriginal
          ? m['track_editor.editor.original']()
          : m['track_editor.editor.edited'](),
      })}
    </div>
    {#if edited}
      <Button
        onClick={() => (downloadOriginal = !downloadOriginal)}
        size="xs"
        variant="text"
        unPadded
        color="primary"
      >
        {m['track_editor.editor.change_btn']({
          file: downloadOriginal
            ? m['track_editor.editor.edited']()
            : m['track_editor.editor.original'](),
        })}
      </Button>
    {/if}
  </div>

  <div class="flex gap-3">
    <Button class="!flex-1" onClick={handleClipboardClick}
      >{m['track_editor.editor.clipboard']()}</Button
    >
    <Button class="!flex-1" onClick={handleFileDownloadClick}
      >{m['track_editor.editor.file']()}</Button
    >
  </div>
</Card>
