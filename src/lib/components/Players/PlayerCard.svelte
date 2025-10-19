<script lang="ts">
  import { m as msg } from '$lib/paraglide/messages';
  import Button from '$lib/ui/Button/Button.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import HighlightText from '$lib/ui/HighlightText/HighlightText.svelte';
  import { isSm } from '$lib/utils/media.svelte';
  import type { PlayerData } from '../Map/Map/types';
  import vehiclesName from '$lib/assets/data/out_vehicles_name.json';
  import type { MtLocaleKey } from '$lib/data/types';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import { getLocationAtPoint } from '$lib/data/area';

  export interface HoverInfoTooltipProps {
    player: PlayerData;
    highlight: string;
    onCenter: (point: [number, number]) => void;
  }

  const { player, highlight, onCenter }: HoverInfoTooltipProps = $props();

  const vehicleName = $derived(
    (vehiclesName as Record<string, Partial<Record<MtLocaleKey, string>> | undefined>)[
      player.vehicleKey
    ],
  );
</script>

<Card class="relative overflow-hidden">
  <div class="mb-2 flex w-full items-center justify-between">
    <h2 class="flex-1 truncate text-lg font-semibold">
      <HighlightText
        text={player.name}
        {highlight}
        caseInSensitive
        tag="span"
        highlightClass="inline-block bg-yellow-500/20 dark:bg-yellow-500/25"
      />
    </h2>
    <Button
      tag="a"
      size="xs"
      variant="text"
      href={isSm.current ? `/map?menu=players&player=${player.guid}` : `/map?player=${player.guid}`}
      class="-mr-1.5"
      color="info"
      onClick={() => onCenter([player.coord.x, player.coord.y])}
    >
      {msg.view_on_map()}
    </Button>
  </div>

  <div class="text-sm opacity-85">
    {player.vehicleKey !== 'None'
      ? msg['players.details_driving']({
          vehicle: vehicleName
            ? getMtLocale(vehicleName)
            : msg['map.player_info.unknown_vehicle'](),
          location: getLocationAtPoint(player.coord),
        })
      : msg['players.details']({
          location: getLocationAtPoint(player.coord),
        })}
  </div>
</Card>
