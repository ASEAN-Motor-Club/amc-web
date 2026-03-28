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
    P: 'bg-blue-600',
    G: 'bg-green-700',
    M: 'bg-amber-600',
    C: 'bg-red-700',
  };
</script>

{#if roles.length > 0}
  <div class="flex flex-wrap gap-x-1 gap-y-0.5">
    {#each roles as role (role.letter)}
      <Button
        variant="contained"
        color="custom"
        size="xxs"
        tag="div"
        class="pointer-events-none {roleColorClass[role.letter]}"
      >
        {roleLabels[role.letter]()}{role.level != null ? ` - ${role.level}` : ''}
      </Button>
    {/each}
  </div>
  <div class="my-0.5 w-full border-t-1 border-gray-100/20"></div>
{/if}
<div class="text-xs">
  <PlayerVehicleInfo vehicleKey={hoverInfo.info.vehicleKey} />
</div>
