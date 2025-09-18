<script lang="ts">
  import vehiclesName from '$lib/assets/data/vehicles_name.json';
  import { m as msg } from '$lib/paraglide/messages';

  export interface playerVehicleInfoProps {
    vehicleKey: string | 'None';
  }

  const { vehicleKey }: playerVehicleInfoProps = $props();
</script>

{vehicleKey !== 'None'
  ? msg['map.player_info.driving']({
      vehicle:
        vehiclesName[vehicleKey as keyof typeof vehiclesName] ??
        msg['map.player_info.unknown_vehicle'](),
    })
  : msg['map.player_info.on_foot']()}
