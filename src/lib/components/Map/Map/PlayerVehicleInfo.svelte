<script lang="ts">
  import vehiclesName from '$lib/assets/data/out_vehicles_name.json';
  import { m as msg } from '$lib/paraglide/messages';
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
  ? msg['map.player_info.driving']({
      vehicle: vehicleName ? getMtLocale(vehicleName) : msg['map.player_info.unknown_vehicle'](),
    })
  : msg['map.player_info.on_foot']()}
