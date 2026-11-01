<script lang="ts">
  import { m } from '#messages';
  import type { TeleportPoint } from './types.ts';

  export interface HoverInfo {
    info: TeleportPoint;
  }

  export interface HoverInfoTooltipProps {
    hoverInfo: HoverInfo;
  }

  const { hoverInfo }: HoverInfoTooltipProps = $props();
</script>

<div class="flex flex-col text-xs text-text-300">
  <div>
    <div class="font-semibold text-text-200">{m['map.teleport_coord']()}</div>
    {Math.round(hoverInfo.info.coord.x)},
    {Math.round(hoverInfo.info.coord.y)},
    {Math.round(hoverInfo.info.coord.z)}
  </div>
  {#if hoverInfo.info.aliases?.length}
    <div>
      <div class="font-semibold text-text-200">{m['map.teleport_alias']()}</div>
      {hoverInfo.info.aliases.join(', ')}
    </div>
  {/if}
</div>
