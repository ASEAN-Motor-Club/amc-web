<script lang="ts">
  import { onMount } from 'svelte';
  import { init } from 'wasm-map';
  onMount(() => {
    init('#map');
  });
</script>

<div class="h-full w-full">
  <canvas id="map"></canvas>
</div>
