<script>
  import Divider from './Divider.svelte';
</script>

<div class="grid gap-4">
  <h2 class="text-xl font-bold">Divider Component</h2>

  <div class="space-y-4">
    <div>
      <h3 class="mb-2 font-semibold">Default Divider</h3>
      <p>Content above the divider</p>
      <Divider />
      <p>Content below the divider</p>
    </div>

    <div>
      <h3 class="mb-2 font-semibold">Small Spacing</h3>
      <p>Content above</p>
      <Divider spacing="sm" />
      <p>Content below</p>
    </div>

    <div>
      <h3 class="mb-2 font-semibold">Large Spacing</h3>
      <p>Content above</p>
      <Divider spacing="lg" />
      <p>Content below</p>
    </div>

    <div>
      <h3 class="mb-2 font-semibold">Custom Styled Divider</h3>
      <p>Content above</p>
      <Divider class="border-2 border-red-500/70" />
      <p>Content below</p>
    </div>
  </div>
</div>
