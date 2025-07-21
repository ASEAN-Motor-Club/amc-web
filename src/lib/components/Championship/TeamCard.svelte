<script lang="ts">
  import Card from '$lib/ui/Card/Card.svelte';
  import type { Team } from './types';

  type TeamCardProps = {
    team: Team;
  };

  const { team }: TeamCardProps = $props();
</script>

<Card
  class="max-w-120 !ring-[var(--team-text)]/10 !shadow-[var(--team-text)]/10 hover:!ring-[var(--team-text)]/50 hover:!shadow-[var(--team-text)]/50 relative flex h-40 w-full justify-between overflow-hidden !bg-[var(--team-bg)] !p-0 text-[var(--team-text)] transition-all"
  style="--team-bg:{team.bg};--team-text:{team.text}"
  tag="a"
  href={team.link}
  target="_blank"
>
  <div class="z-1 relative flex h-full flex-col justify-between p-4">
    <h5 class="text-shadow-sm text-shadow-[var(--team-bg)]/80 font-semibold">
      [{team.tag}] {team.name}
    </h5>
    <p class="text-shadow-sm text-shadow-[var(--team-bg)]/80 text-sm italic">
      &OpenCurlyDoubleQuote;{team.description}&CloseCurlyDoubleQuote;
    </p>
  </div>
  {#if team.logo}
    <div class="aspect-1 absolute z-0 h-full flex-none max-sm:right-0 max-sm:top-0 sm:relative">
      <div
        class="bg-linear-to-r absolute inset-0 h-full w-full from-[var(--team-bg)] to-transparent"
      ></div>
      <img src={team.logo} alt="{team.name} Logo" class="aspect-1 h-full object-cover" />
    </div>
  {/if}
</Card>
