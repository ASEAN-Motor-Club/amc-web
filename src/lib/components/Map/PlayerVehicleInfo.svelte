<script lang="ts">
  import vehiclesKey from '$lib/assets/data/vehicles_key.json';
  import { m } from '$lib/paraglide/messages';

  export type playerVehicleInfoProps = {
    vehicleKey: string | 'None';
  };

  const { vehicleKey }: playerVehicleInfoProps = $props();
</script>

{vehicleKey !== 'None'
  ? m['map.player_info.driving']({
      vehicle:
        vehiclesKey[vehicleKey as keyof typeof vehiclesKey] ??
        m['map.player_info.unknown_vehicle'](),
    })
  : m['map.player_info.on_foot']()}
