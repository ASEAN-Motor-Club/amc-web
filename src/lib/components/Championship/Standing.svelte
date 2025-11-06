<script lang="ts">
  import { m } from '$messages';
  import { getAbortSignal, onMount } from 'svelte';
  import { getPersonalStandings, getTeamStandings } from '$lib/api/championship';
  import type { TeamStanding, PersonalStanding } from '$lib/api/types';
  import { PUBLIC_SEASON_NO } from '$env/static/public';
  import StandingCard from './StandingCard.svelte';
  import TruncateText from '$lib/ui/TruncateText/TruncateText.svelte';
  import TableEmptyState from '$lib/ui/Table/TableEmptyState.svelte';
  import TableRow from '$lib/ui/Table/TableRow.svelte';

  let loading = $state(true);
  let teamStandings: TeamStanding[] = $state([]);
  let personalStandings: PersonalStanding[] = $state([]);

  onMount(async () => {
    const [teamStandingsResponse, personalStandingsResponse] = await Promise.all([
      getTeamStandings(+PUBLIC_SEASON_NO, getAbortSignal()),
      getPersonalStandings(+PUBLIC_SEASON_NO, getAbortSignal()),
    ]);

    teamStandings = teamStandingsResponse;
    personalStandings = personalStandingsResponse;
    loading = false;
  });
</script>

<div
  class="-mx-8 flex flex-row items-center gap-4 overflow-x-auto px-8 py-4 sm:mx-0 sm:justify-center sm:overflow-x-visible sm:p-0"
>
  <StandingCard
    title={m['championship.team_standing']()}
    {loading}
    empty={teamStandings.length === 0}
  >
    {#snippet emptyState()}
      <TableEmptyState>
        {m['championship.no_standing']()}
      </TableEmptyState>
    {/snippet}
    {#snippet children({ getStandingRowClass })}
      {#each teamStandings as standing, index (standing.team_id)}
        <TableRow class={getStandingRowClass(index)}>
          <div>{index + 1}</div>
          <TruncateText text={`[${standing.team_tag}] ${standing.team_name}`}>
            <span class="font-bold">[{standing.team_tag}]</span>
            {standing.team_name}
          </TruncateText>
          <div class="text-right font-bold">{standing.total_points}</div>
        </TableRow>
      {/each}
    {/snippet}
  </StandingCard>

  <StandingCard
    title={m['championship.personal_standing']()}
    {loading}
    empty={personalStandings.length === 0}
  >
    {#snippet emptyState()}
      <TableEmptyState>
        {m['championship.no_standing']()}
      </TableEmptyState>
    {/snippet}
    {#snippet children({ getStandingRowClass })}
      {#each personalStandings as standing, index (`${standing.player_id}-${standing.character_name}`)}
        <TableRow class={getStandingRowClass(index)}>
          <div>{index + 1}</div>
          <TruncateText text={standing.character_name} />
          <div class="text-right font-bold">
            {standing.total_points}
          </div>
        </TableRow>
      {/each}
    {/snippet}
  </StandingCard>
</div>
