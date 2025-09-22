<script lang="ts">
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { onMount } from 'svelte';
  import { getPersonalStandings, getTeamStandings } from '$lib/api/championship';
  import type { TeamStanding, PersonalStanding } from '$lib/api/types';
  import { PUBLIC_SEASON_NO } from '$env/static/public';
  import StandingCard from './StandingCard.svelte';

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
  <StandingCard title={siteLocale.msg['championship.team_standing']()} {loading}>
    {#snippet children({ getStandingRowClass })}
      {#each teamStandings as standing, index (standing.team_id)}
        <div class={getStandingRowClass(index)}>
          <div>{index + 1}</div>
          <div class="truncate">
            <span class="font-bold">[{standing.team_tag}]</span>
            {standing.team_name}
          </div>
          <div class="text-right font-bold">{standing.total_points}</div>
        </div>
      {/each}
    {/snippet}
  </StandingCard>

  <StandingCard title={siteLocale.msg['championship.personal_standing']()} {loading}>
    {#snippet children({ getStandingRowClass })}
      {#each personalStandings as standing, index (`${standing.player_id}-${standing.character_name}`)}
        <div class={getStandingRowClass(index)}>
          <div>{index + 1}</div>
          <div class="truncate">{standing.character_name}</div>
          <div class="text-right font-bold">
            {standing.total_points}
          </div>
        </div>
      {/each}
    {/snippet}
  </StandingCard>
</div>
