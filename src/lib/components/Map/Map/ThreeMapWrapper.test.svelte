<!-- Test harness: gives the map the explicit size it gets from the app's full-height layout chain,
     and re-exports its view snapshot. -->
<script lang="ts">
  import ThreeMapWrapper, { type ThreeMapWrapperProps } from './ThreeMapWrapper.svelte';

  const props: ThreeMapWrapperProps = $props();
  let map = $state<ThreeMapWrapper | undefined>();
  export const getViewState = () => map?.getViewState();
</script>

<div style="width: 600px; height: 400px; position: relative">
  <ThreeMapWrapper bind:this={map} {...props} />
</div>
