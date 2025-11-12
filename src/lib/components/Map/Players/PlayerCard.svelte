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

  const vehicleName = $derived(
    (vehiclesName as Record<string, MtNameRecord | undefined>)[player?.vehicleKey ?? 'None'],
  );

  const playerName = $derived(player?.name ?? '.');
</script>

<Card class="relative overflow-hidden" {loading}>
  <div class="mb-2 flex w-full items-center justify-between">
    <TruncateText tag="h2" text={playerName} class="flex-1 text-lg font-semibold">
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
      color="info"
      onClick={() => onCenter([player?.coord.x ?? 0, player?.coord.y ?? 0])}
    >
      {m.view_on_map()}
    </Button>
  </div>

  <div class="text-sm opacity-85">
    {loading
      ? '.'
      : player?.vehicleKey !== 'None'
        ? m['players.details_driving']({
            vehicle: vehicleName
              ? getMtLocale(vehicleName)
              : m['map.player_info.unknown_vehicle'](),
            location: getLocationAtPoint(player?.coord ?? { x: 0, y: 0 }),
          })
        : m['players.details']({
            location: getLocationAtPoint(player.coord),
          })}
  </div>
</Card>
