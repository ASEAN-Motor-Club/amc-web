<script lang="ts">
  import { type PlayerData } from './types';
  import PlayerVehicleInfo from './PlayerVehicleInfo.svelte';

  export type HoverInfo = {
    info: PlayerData;
  };

  export type HoverInfoTooltipProps = {
    hoverInfo: HoverInfo;
  };

  const { hoverInfo }: HoverInfoTooltipProps = $props();
</script>

<div class="text-xs">
  <PlayerVehicleInfo vehicleKey={hoverInfo.info.vehicleKey} />
</div>
