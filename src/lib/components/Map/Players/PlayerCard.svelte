<script lang="ts">
  import { m } from '$messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import HighlightText from '$lib/ui/HighlightText/HighlightText.svelte';
  import type { PlayerData } from '../Map/types';
  import vehiclesName from '$lib/assets/data/out_vehicles_name.json';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import { getLocationAtPoint } from '$lib/data/area';
  import { Features, getViewHref } from '../utils';
  import TruncateText from '$lib/ui/TruncateText/TruncateText.svelte';
  import type { MtNameRecord } from '$lib/types';

  export interface Props {
    player?: PlayerData;
    highlight: string;
    onCenter: (point: [number, number]) => void;
    loading?: boolean;
  }

  const { player, highlight, onCenter, loading }: Props = $props();

  const vehicleKey = $derived(player?.vehicleKey ?? 'None');

  const vehicleName = $derived(
    (vehiclesName as Record<string, MtNameRecord | undefined>)[vehicleKey],
  );

  const playerName = $derived(player?.name ?? '.');
</script>

<Card class="relative overflow-hidden" {loading}>
  <div class="flex w-full items-center justify-between">
    <TruncateText tag="h2" text={playerName} class="flex-1 font-semibold">
      <HighlightText
        text={playerName}
        {highlight}
        caseInSensitive
        tag="span"
        highlightClass="inline-block bg-yellow-500/20 dark:bg-yellow-500/25"
      />
    </TruncateText>
    <Button
      tag="a"
      size="xs"
      variant="text"
      href={getViewHref(Features.Player, player?.guid ?? '')}
      class="-mr-1.5"
      color="primary"
      onClick={() => onCenter([player?.coord.x ?? 0, player?.coord.y ?? 0])}
    >
      {m.view_on_map()}
    </Button>
  </div>

  <div class="text-text-700 dark:text-text-300 mt-2 flex justify-between gap-1 text-sm">
    <div class="truncate">
      <div class="text-text-500 text-xs font-semibold">{m['map.player_info.vehicle']()}</div>
      <div class={[vehicleKey === 'None' ? 'italic' : '']}>
        {vehicleKey === 'None'
          ? m['map.player_info.on_foot']()
          : vehicleName
            ? getMtLocale(vehicleName)
            : m['map.player_info.unknown_vehicle']()}
      </div>
    </div>
    <div class="text-right">
      <div class="text-text-500 text-xs font-semibold">{m['map.player_info.location']()}</div>
      <div>
        {player ? getLocationAtPoint(player.coord) : '.'}
      </div>
    </div>
  </div>
</Card>
