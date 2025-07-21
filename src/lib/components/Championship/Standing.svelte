<script lang="ts">
  import Card from '$lib/ui/Card/Card.svelte';
  import { m } from '$lib/paraglide/messages';
</script>

<h4 class="pt-18 pb-8 text-4xl font-semibold tracking-tight">Standing</h4>
<div class="flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
  <Card class="max-w-120 overflow-hidden">
    <h4 class="-m-4 mb-0 bg-neutral-500/10 p-4 text-xl font-medium">
      {m['championship.team_standing']()}
    </h4>
    <div
      class="aspect-1 text-text/60 dark:text-text-dark/60 flex w-full items-center justify-center text-center text-sm italic"
    >
      {m['championship.coming_back']()}
    </div>
  </Card>
  <Card class="max-w-120 overflow-hidden">
    <h4 class="-m-4 mb-0 bg-neutral-500/10 p-4 text-xl font-medium">
      {m['championship.personal_standing']()}
    </h4>
    <div
      class="aspect-1 text-text/60 dark:text-text-dark/60 flex w-full items-center justify-center text-center text-sm italic"
    >
      {m['championship.coming_back']()}
    </div>
  </Card>
</div>
