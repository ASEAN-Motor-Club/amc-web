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
    P: 'bg-blue-600 hover:bg-[color-mix(in_oklab,#2563eb_90%,white)] active:bg-[color-mix(in_oklab,#2563eb_95%,black)]',
    G: 'bg-green-600 hover:bg-[color-mix(in_oklab,#16a34a_90%,white)] active:bg-[color-mix(in_oklab,#16a34a_95%,black)]',
    M: 'bg-amber-600 hover:bg-[color-mix(in_oklab,#d97706_90%,white)] active:bg-[color-mix(in_oklab,#d97706_95%,black)]',
    C: 'bg-red-600 hover:bg-[color-mix(in_oklab,#dc2626_90%,white)] active:bg-[color-mix(in_oklab,#dc2626_95%,black)]',
  };
</script>

{#if roles.length > 0}
  <div class="mb-0.5 flex gap-1">
    {#each roles as role (role.letter)}
      <Button
        variant="contained"
        color="custom"
        size="xs"
        tag="div"
        class="pointer-events-none h-5 px-1.5 font-medium {roleColorClass[role.letter]}"
      >
        {roleLabels[role.letter]()}{role.level != null ? ` - ${role.level}` : ''}
      </Button>
    {/each}
  </div>
{/if}
<div class="text-xs">
  <PlayerVehicleInfo vehicleKey={hoverInfo.info.vehicleKey} />
</div>
