<script lang="ts">
  import type { PlayerData } from './types';
  import PlayerVehicleInfo from './PlayerVehicleInfo.svelte';
  import { parsePlayerRoles } from '$lib/utils/parsePlayerRole';
  import { m } from '$messages';
  import Button from '$lib/ui/Button/Button.svelte';

  export interface HoverInfo {
    info: PlayerData;
  }

  export interface HoverInfoTooltipProps {
    hoverInfo: HoverInfo;
  }

  const { hoverInfo }: HoverInfoTooltipProps = $props();

  const roles = $derived(parsePlayerRoles(hoverInfo.info.name));

  const roleLabels: Record<string, () => string> = {
    P: () => m['map.player_info.roles.P'](),
    G: () => m['map.player_info.roles.G'](),
    M: () => m['map.player_info.roles.M'](),
    C: () => m['map.player_info.roles.C'](),
  };

  const roleColorClass: Record<string, string> = {
    P: 'bg-blue-500',
    G: 'bg-green-500',
    M: 'bg-amber-500',
    C: 'bg-red-500',
  };
</script>

{#if roles.length > 0}
  <div class="mb-0.5 flex gap-1">
    {#each roles as role (role.letter)}
      <Button
        variant="contained"
        color="custom"
        size="xxs"
        tag="div"
        class="pointer-events-none font-medium {roleColorClass[role.letter]}"
      >
        {roleLabels[role.letter]()}{role.level != null ? ` - ${role.level}` : ''}
      </Button>
    {/each}
  </div>
{/if}
<div class="text-xs">
  <PlayerVehicleInfo vehicleKey={hoverInfo.info.vehicleKey} />
</div>
