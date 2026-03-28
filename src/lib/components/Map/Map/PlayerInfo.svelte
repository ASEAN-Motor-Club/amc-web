<script lang="ts">
  import type { PlayerData } from './types';
  import PlayerVehicleInfo from './PlayerVehicleInfo.svelte';
  import { parsePlayerRoles } from '$lib/utils/parsePlayerRole';
  import { m } from '$messages';

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
</script>

{#if roles.length > 0}
  <div class="mb-0.5 flex gap-1">
    {#each roles as role (role.letter)}
      <span
        class="inline-block rounded-sm px-1 py-0.5 text-[10px] leading-none font-semibold text-white {role.color}"
      >
        {roleLabels[role.letter]()}{role.level != null ? ` - ${role.level}` : ''}
      </span>
    {/each}
  </div>
{/if}
<div class="text-xs">
  <PlayerVehicleInfo vehicleKey={hoverInfo.info.vehicleKey} />
</div>
