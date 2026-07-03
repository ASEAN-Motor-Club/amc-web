<script lang="ts">
  import { fade } from 'svelte/transition';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import ClickAwayBlock from '$lib/ui/ClickAwayBlock/ClickAwayBlock.svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { m } from '$messages';
  import PoiItem from './PoiItem.svelte';
  import { PoiType, type MapState } from './types';

  interface Props {
    mapState: MapState;
    havePins: boolean;
    haveTeleports: boolean;
    haveShortcutZones: boolean;
    onToggle: (poi: PoiType) => void;
  }

  const { mapState, havePins, haveTeleports, haveShortcutZones, onToggle }: Props = $props();

  let poiOpen = $state(false);
</script>

<!-- POI trigger + floating card (bottom-left) -->
<div class="pointer-events-none absolute bottom-0 left-0 h-full w-full p-4 pt-18">
  <ClickAwayBlock active={poiOpen} onClickAway={() => (poiOpen = false)}>
    <div class="flex h-full w-full flex-col items-start justify-end gap-2">
      {#if poiOpen}
        <div
          class="flex min-h-0 shrink"
          transition:fade={{ duration: defaultTransitionDurationMs }}
        >
          <Card
            class="pointer-events-auto min-h-0 flex-1 overflow-y-auto !bg-gray-900/50 !p-0 !shadow-white/3 !ring-white/5 backdrop-blur-sm"
          >
            <div class="flex flex-col">
              <!-- Delivery -->
              <PoiItem
                dotClass="border-yellow-950 bg-yellow-500"
                label={m['map.poi.delivery']()}
                desc={m['map.poi.delivery_desc']()}
                enabled={mapState.delivery}
                onclick={() => onToggle(PoiType.Delivery)}
              />
              <PoiItem
                dotClass="border-orange-950 bg-orange-400"
                label={m['map.poi.jobs_only']()}
                desc={m['map.poi.jobs_only_desc']()}
                enabled={mapState.jobOnly}
                onclick={() => onToggle(PoiType.JobsOnly)}
                parentEnabled={mapState.delivery}
                sub
              />

              <div class="border-t border-gray-100/10"></div>

              <!-- House -->
              <PoiItem
                dotClass="border-cyan-950 bg-cyan-500"
                label={m['map.poi.house']()}
                desc={m['map.poi.house_desc']()}
                enabled={mapState.house}
                onclick={() => onToggle(PoiType.House)}
              />
              <PoiItem
                dotClass="border-gray-950 bg-white"
                label={m['map.poi.house_labels']()}
                desc={m['map.poi.house_labels_desc']()}
                enabled={mapState.houseLabels}
                onclick={() => onToggle(PoiType.HouseLabels)}
                parentEnabled={mapState.house}
                sub
              />
              <PoiItem
                dotClass="border-cyan-950 bg-cyan-300"
                label={m['map.poi.house_vacant_only']()}
                desc={m['map.poi.house_vacant_only_desc']()}
                enabled={mapState.houseVacantOnly}
                onclick={() => onToggle(PoiType.HouseVacantOnly)}
                parentEnabled={mapState.house}
                sub
              />

              <div class="border-t border-gray-100/10"></div>

              <!-- Player -->
              <PoiItem
                dotClass="border-emerald-950 bg-emerald-400"
                label={m['map.poi.player']()}
                desc={m['map.poi.player_desc']()}
                enabled={mapState.player}
                onclick={() => onToggle(PoiType.Player)}
              />
              <PoiItem
                dotClass="border-gray-950 bg-white"
                label={m['map.poi.player_names']()}
                desc={m['map.poi.player_names_desc']()}
                enabled={mapState.playerName}
                onclick={() => onToggle(PoiType.PlayerName)}
                parentEnabled={mapState.player}
                sub
              />
              <PoiItem
                dotClass="border-blue-950 bg-blue-500"
                label={m['map.poi.player_police']()}
                desc={m['map.poi.player_police_desc']()}
                enabled={mapState.playerCopsOnly}
                onclick={() => onToggle(PoiType.PlayerCopsOnly)}
                parentEnabled={mapState.player}
                sub
              />
              <PoiItem
                dotClass="border-red-950 bg-red-500"
                label={m['map.poi.player_criminal']()}
                desc={m['map.poi.player_criminal_desc']()}
                enabled={mapState.playerCriminalOnly}
                onclick={() => onToggle(PoiType.PlayerCriminalOnly)}
                parentEnabled={mapState.player}
                sub
              />

              {#if havePins}
                <div class="border-t border-gray-100/10"></div>

                <!-- Pin -->
                <PoiItem
                  dotClass="border-red-950 bg-red-400"
                  label={m['map.poi.pins']()}
                  desc={m['map.poi.pin_desc']()}
                  enabled={mapState.pins}
                  onclick={() => onToggle(PoiType.Pins)}
                />
                <PoiItem
                  dotClass="border-red-950 bg-red-200"
                  label={m['map.poi.pin_labels']()}
                  desc={m['map.poi.pin_labels_desc']()}
                  enabled={mapState.pinLabels}
                  onclick={() => onToggle(PoiType.PinLabels)}
                  parentEnabled={mapState.pins}
                  sub
                />
              {/if}

              {#if haveTeleports}
                <div class="border-t border-gray-100/10"></div>

                <!-- Teleport -->
                <PoiItem
                  dotClass="border-violet-950 bg-violet-400"
                  label={m['map.poi.teleport']()}
                  desc={m['map.poi.teleport_desc']()}
                  enabled={mapState.teleport}
                  onclick={() => onToggle(PoiType.Teleport)}
                />
                <PoiItem
                  dotClass="border-gray-950 bg-white"
                  label={m['map.poi.teleport_labels']()}
                  desc={m['map.poi.teleport_labels_desc']()}
                  enabled={mapState.teleportLabels}
                  onclick={() => onToggle(PoiType.TeleportLabels)}
                  parentEnabled={mapState.teleport}
                  sub
                />
              {/if}

              {#if haveShortcutZones}
                <div class="border-t border-gray-100/10"></div>

                <!-- Shortcut Zones -->
                <PoiItem
                  dotClass="border-red-500 bg-red-500/12 border-dashed border-2"
                  label={m['map.poi.shortcut_zone']()}
                  desc={m['map.poi.shortcut_zone_desc']()}
                  enabled={mapState.shortcutZone}
                  onclick={() => onToggle(PoiType.ShortcutZone)}
                />
                <PoiItem
                  dotClass="border-gray-950 bg-white"
                  label={m['map.poi.shortcut_zone_labels']()}
                  desc={m['map.poi.shortcut_zone_labels_desc']()}
                  enabled={mapState.shortcutZoneLabels}
                  onclick={() => onToggle(PoiType.ShortcutZoneLabels)}
                  parentEnabled={mapState.shortcutZone}
                  sub
                />
              {/if}
            </div>
          </Card>
        </div>
      {/if}
      <Button
        class="text-text-dark pointer-events-auto !bg-gray-900/50 shadow ring !shadow-white/3 !ring-white/5 backdrop-blur-sm hover:!bg-gray-900/40 focus:!bg-gray-900/60"
        color="custom"
        onClick={() => (poiOpen = !poiOpen)}
        size="sm"
      >
        {#snippet prependIcon()}
          <Icon class="i-material-symbols:location-on-rounded" />
        {/snippet}
        {m['map.point_of_interests']()}
      </Button>
    </div>
  </ClickAwayBlock>
</div>
