<script lang="ts">
  import { m as msg } from '$lib/paraglide/messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import HighlightText from '$lib/ui/HighlightText/HighlightText.svelte';
  import type { PlayerData } from '../Map/types';
  import vehiclesName from '$lib/assets/data/out_vehicles_name.json';
  import type { MtLocaleKey } from '$lib/data/types';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import { getLocationAtPoint } from '$lib/data/area';
  import { Features, getViewHref } from '../utils';

  export interface Props {
    player?: PlayerData;
    highlight: string;
    onCenter: (point: [number, number]) => void;
    loading?: boolean;
  }

  const { player, highlight, onCenter, loading }: Props = $props();

  const vehicleName = $derived(
    (vehiclesName as Record<string, Partial<Record<MtLocaleKey, string>> | undefined>)[
      player?.vehicleKey ?? 'None'
    ],
  );
</script>

<Card class="relative overflow-hidden" {loading}>
  <div class="mb-2 flex w-full items-center justify-between">
    <h2 class="flex-1 truncate text-lg font-semibold">
      {#if loading}
        .
      {:else}
        <HighlightText
          text={player?.name ?? ''}
          {highlight}
          caseInSensitive
          tag="span"
          highlightClass="inline-block bg-yellow-500/20 dark:bg-yellow-500/25"
        />
      {/if}
    </h2>
    <Button
      tag="a"
      size="xs"
      variant="text"
      href={getViewHref(Features.player, player?.guid ?? '')}
      class="-mr-1.5"
      color="info"
      onClick={() => onCenter([player?.coord.x ?? 0, player?.coord.y ?? 0])}
    >
      {msg.view_on_map()}
    </Button>
  </div>

  <div class="text-sm opacity-85">
    {loading
      ? '.'
      : player?.vehicleKey !== 'None'
        ? msg['players.details_driving']({
            vehicle: vehicleName
              ? getMtLocale(vehicleName)
              : msg['map.player_info.unknown_vehicle'](),
            location: getLocationAtPoint(player?.coord ?? { x: 0, y: 0 }),
          })
        : msg['players.details']({
            location: getLocationAtPoint(player.coord),
          })}
  </div>
</Card>
