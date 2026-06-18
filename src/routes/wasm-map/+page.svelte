<script lang="ts">
  import { onMount } from 'svelte';
  import { init, create_layer, set_layer_features, create_feature_point } from 'wasm-map';
  import { deliveryPoints } from '$lib/data/deliveryPoint';
  import { colorAmber400 } from '$lib/tw-var';

  onMount(() => {
    init('#map');

    create_layer(0, 20, 2, 12, colorAmber400);
    set_layer_features(
      0,
      deliveryPoints.map((dp) => create_feature_point(dp.coord.x, dp.coord.y, dp.name.en))
    );
  });
</script>

<div class="h-full w-full">
  <canvas id="map"></canvas>
</div>
