<!-- 
  @component Empty
  
  Empty Component that accepts any props but does not render anything.
-->
<script lang="ts">
  export type EmptyProps = Record<string, unknown>;

  const { ..._ }: EmptyProps = $props();
</script>
