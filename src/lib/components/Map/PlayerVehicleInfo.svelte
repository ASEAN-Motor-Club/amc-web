<script lang="ts">
  import vehiclesName from '$lib/assets/data/vehicles_name.json';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { mtLocale } from '../Locale/locale.svelte';

  export interface playerVehicleInfoProps {
    vehicleKey: string | 'None';
  }

  const { vehicleKey }: playerVehicleInfoProps = $props();
</script>

{vehicleKey !== 'None'
  ? siteLocale.msg['map.player_info.driving']({
      vehicle:
        vehiclesName[vehicleKey as keyof typeof vehiclesName][mtLocale.l] ??
        siteLocale.msg['map.player_info.unknown_vehicle'](),
    })
  : siteLocale.msg['map.player_info.on_foot']()}
