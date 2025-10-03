<script lang="ts">
  import vehiclesName from '$lib/assets/data/vehicles_name.json';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import type { MtLocaleKey } from '$lib/data/types';
  import { getMtLocale } from '$lib/utils/getMtLocale';

  export interface playerVehicleInfoProps {
    vehicleKey: string | 'None';
  }

  const { vehicleKey }: playerVehicleInfoProps = $props();

  const vehicleName = $derived(
    (vehiclesName as Record<string, Partial<Record<MtLocaleKey, string>> | undefined>)[vehicleKey],
  );
</script>

{vehicleKey !== 'None'
  ? siteLocale.msg['map.player_info.driving']({
      vehicle: vehicleName
        ? getMtLocale(vehicleName)
        : siteLocale.msg['map.player_info.unknown_vehicle'](),
    })
  : siteLocale.msg['map.player_info.on_foot']()}
