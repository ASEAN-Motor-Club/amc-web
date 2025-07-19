<script lang="ts">
  import { PointType, type PlayerData } from './types';
  import PlayerVehicleInfo from './PlayerVehicleInfo.svelte';

  export type HoverInfo = {
    name: string | undefined;
    pixelCoord: [number, number];
    pointType: PointType.Player;
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
