<script lang="ts">
  import { m } from '#messages';
  import Button from '#lib/ui/Button/Button.svelte';
  import Card from '#lib/ui/Card/Card.svelte';
  import HighlightText from '#lib/ui/HighlightText/HighlightText.svelte';
  import type { PlayerData } from '../Map/types.ts';
  import vehiclesName from '#lib/assets/data/out_vehicles_name.json';
  import { getMtLocale } from '#lib/utils/getMtLocale.ts';
  import { Features, formatLocationAtPoint, getViewHref } from '../utils.ts';
  import TruncateText from '#lib/ui/TruncateText/TruncateText.svelte';
  import type { MtNameRecord } from '#lib/types/index.ts';

  export interface Props {
    player?: PlayerData;
    highlight: string;
    loading?: boolean;
  }

  const { player, highlight, loading }: Props = $props();

  const vehicleKey = $derived(player?.vehicleKey ?? 'None');

  /** Backend withheld this player: vehicle and location show as "Hidden". */
  const hidden = $derived(player?.hidden ?? false);

  const vehicleName = $derived(
    (vehiclesName as Record<string, MtNameRecord | undefined>)[vehicleKey],
  );

  const playerName = $derived(player?.name ?? '.');
  const hiddenLabel = $derived(m['map.player_info.hidden']());
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
    {#if !hidden}
      <Button
        tag="a"
        size="xs"
        variant="text"
        href={getViewHref(Features.Player, player?.guid ?? '')}
        class="-mr-1.5"
        color="primary"
      >
        {m.view_on_map()}
      </Button>
    {/if}
  </div>

  <div class="mt-2 flex justify-between gap-1 text-sm text-text-700 dark:text-text-300">
    <div class="truncate">
      <div class="text-xs font-semibold text-text-500">{m['map.player_info.vehicle']()}</div>
      <div class={[hidden || vehicleKey === 'None' ? 'italic' : '']}>
        {hidden
          ? hiddenLabel
          : vehicleKey === 'None'
            ? m['map.player_info.on_foot']()
            : vehicleName
              ? getMtLocale(vehicleName)
              : m['map.player_info.unknown_vehicle']()}
      </div>
    </div>
    <div class="text-right">
      <div class="text-xs font-semibold text-text-500">{m['map.player_info.location']()}</div>
      <div class={[hidden ? 'italic' : '']}>
        {hidden ? hiddenLabel : player ? formatLocationAtPoint(player.coord) : '.'}
      </div>
    </div>
  </div>
</Card>
