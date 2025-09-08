<script lang="ts">
  import vehiclesKey from '$lib/assets/data/vehicles_key.json';
  import { m as msg } from '$lib/paraglide/messages';

  export interface playerVehicleInfoProps {
    vehicleKey: string | 'None';
  }

  const { vehicleKey }: playerVehicleInfoProps = $props();
</script>

{vehicleKey !== 'None'
  ? msg['map.player_info.driving']({
      vehicle:
        vehiclesKey[vehicleKey as keyof typeof vehiclesKey] ??
        msg['map.player_info.unknown_vehicle'](),
    })
  : msg['map.player_info.on_foot']()}
