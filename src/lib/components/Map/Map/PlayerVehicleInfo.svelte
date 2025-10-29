<script lang="ts">
  import vehiclesName from '$lib/assets/data/out_vehicles_name.json';
  import { m } from '$lib/paraglide/messages';
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
  ? m['map.player_info.driving']({
      vehicle: vehicleName ? getMtLocale(vehicleName) : m['map.player_info.unknown_vehicle'](),
    })
  : m['map.player_info.on_foot']()}
