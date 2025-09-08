<script lang="ts">
  import { type PlayerData } from './types';
  import PlayerVehicleInfo from './PlayerVehicleInfo.svelte';

  export interface HoverInfo {
    info: PlayerData;
  }

  export interface HoverInfoTooltipProps {
    hoverInfo: HoverInfo;
  }

  const { hoverInfo }: HoverInfoTooltipProps = $props();
</script>

<div class="text-xs">
  <PlayerVehicleInfo vehicleKey={hoverInfo.info.vehicleKey} />
</div>
