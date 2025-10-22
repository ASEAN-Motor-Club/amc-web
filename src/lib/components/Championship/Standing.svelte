<script lang="ts">
  import { m as msg } from '$lib/paraglide/messages';
  import { onMount } from 'svelte';
  import { getPersonalStandings, getTeamStandings } from '$lib/api/championship';
  import type { TeamStanding, PersonalStanding } from '$lib/api/types';
  import { PUBLIC_SEASON_NO } from '$env/static/public';
  import StandingCard from './StandingCard.svelte';
  import TruncateText from '$lib/ui/TruncateText/TruncateText.svelte';

  let loading = $state(true);
  let teamStandings: TeamStanding[] = $state([]);
  let personalStandings: PersonalStanding[] = $state([]);

  onMount(() => {
    const abortController = new AbortController();

    Promise.all([
      getTeamStandings(+PUBLIC_SEASON_NO, abortController.signal),
      getPersonalStandings(+PUBLIC_SEASON_NO, abortController.signal),
    ]).then(([teamStandingsResponse, personalStandingsResponse]) => {
      teamStandings = teamStandingsResponse;
      personalStandings = personalStandingsResponse;
      loading = false;
    });

    return () => {
      abortController.abort();
    };
  });
</script>

<div
  class="-mx-8 flex flex-row items-center gap-4 overflow-x-auto px-8 py-4 sm:mx-0 sm:justify-center sm:overflow-x-visible sm:p-0"
>
  <StandingCard title={msg['championship.team_standing']()} {loading}>
    {#snippet children({ getStandingRowClass })}
      {#if teamStandings.length > 0}
        {#each teamStandings as standing, index (standing.team_id)}
          <div class={getStandingRowClass(index)}>
            <div>{index + 1}</div>
            <TruncateText text={`[${standing.team_tag}] ${standing.team_name}`}>
              <span class="font-bold">[{standing.team_tag}]</span>
              {standing.team_name}
            </TruncateText>
            <div class="text-right font-bold">{standing.total_points}</div>
          </div>
        {/each}
      {:else}
        <div
          class="text-text/60 dark:text-text-dark/60 flex h-full items-center justify-center p-4 text-sm"
        >
          {msg['championship.no_standing']()}
        </div>
      {/if}
    {/snippet}
  </StandingCard>

  <StandingCard title={msg['championship.personal_standing']()} {loading}>
    {#snippet children({ getStandingRowClass })}
      {#if personalStandings.length > 0}
        {#each personalStandings as standing, index (`${standing.player_id}-${standing.character_name}`)}
          <div class={getStandingRowClass(index)}>
            <div>{index + 1}</div>
            <TruncateText text={standing.character_name} />
            <div class="text-right font-bold">
              {standing.total_points}
            </div>
          </div>
        {/each}
      {:else}
        <div
          class="text-text/60 dark:text-text-dark/60 flex h-full items-center justify-center p-4 text-sm"
        >
          {msg['championship.no_standing']()}
        </div>
      {/if}
    {/snippet}
  </StandingCard>
</div>
