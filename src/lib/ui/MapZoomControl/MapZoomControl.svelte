<script lang="ts">
  import { m } from '#messages';
  import Button from '#lib/ui/Button/Button.svelte';
  import Icon from '#lib/ui/Icon/Icon.svelte';

  export interface MapZoomControlProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
  }

  const { onZoomIn, onZoomOut }: MapZoomControlProps = $props();
</script>

<div
  class="flex flex-col rounded-md shadow ring !shadow-white/3 !ring-white/5 contrast-more:ring-white/60!"
>
  <Button
    class="pointer-events-auto rounded-b-none !bg-gray-900/50 text-text-dark backdrop-blur-sm hover:!bg-gray-900/40 focus-visible:!bg-gray-900/60 contrast-more:bg-gray-950! contrast-more:hover:bg-gray-800! contrast-more:focus-visible:bg-gray-800!"
    color="custom"
    size="sm"
    icon
    onClick={onZoomIn}
    aria-label={m['a11y.zoom_in']()}
  >
    <Icon class="icon-[material-symbols--add-2-rounded]" />
  </Button>
  <div
    class="w-full border-b border-b-white/25 bg-gray-900/50 contrast-more:border-b-white/60 contrast-more:bg-gray-950!"
  ></div>
  <Button
    class="pointer-events-auto rounded-t-none !bg-gray-900/50 text-text-dark backdrop-blur-sm hover:!bg-gray-900/40 focus-visible:!bg-gray-900/60 contrast-more:bg-gray-950! contrast-more:hover:bg-gray-800! contrast-more:focus-visible:bg-gray-800!"
    color="custom"
    size="sm"
    icon
    onClick={onZoomOut}
    aria-label={m['a11y.zoom_out']()}
  >
    <Icon class="icon-[material-symbols--remove-rounded]" />
  </Button>
</div>
