<script lang="ts">
  import Card from '$lib/ui/Card/Card.svelte';
  import { m } from '$lib/paraglide/messages';
  import { onMount } from 'svelte';
  import { getPersonalStandings, getTeamStandings } from '$lib/api/championship';
  import type { TeamStanding, PersonalStanding } from '$lib/api/types';

  type Props = {
    season: number;
  };

  const { season }: Props = $props();

  let loading = $state(true);
  let teamStandings: TeamStanding[] = $state([]);
  let personalStandings: PersonalStanding[] = $state([]);

  onMount(() => {
    const abortController = new AbortController();

    Promise.all([
      getTeamStandings(season, abortController.signal),
      getPersonalStandings(season, abortController.signal),
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

<h4 class="pb-8 text-center text-4xl font-semibold tracking-tight">
  {m['championship.standing']()}
</h4>
<div
  class="-my-8 flex w-full flex-row items-center gap-4 overflow-x-auto p-8 sm:m-0 sm:my-0 sm:justify-center sm:overflow-x-visible"
>
  <Card class="sm:min-w-unset w-full min-w-full max-w-80 overflow-hidden !p-0 sm:flex-1">
    <h4 class="bg-neutral-500/10 p-4 text-xl font-medium">
      {m['championship.team_standing']()}
    </h4>
    <div
      class={[
        'aspect-1 flex w-full',
        loading ? 'items-center justify-center' : 'flex-col overflow-y-auto',
      ]}
    >
      {#if loading}
        <div class="text-text/60 dark:text-text-dark/60 pt-4 text-center text-sm italic">
          {m['championship.loading']()}
        </div>
      {:else}
        {#each teamStandings as standing (standing.team_id)}
          <div
            class="flex items-center justify-between border-b border-neutral-500/10 p-4 text-sm last:border-0"
          >
            <span>{standing.team_name}</span>
            <span>{standing.total_points}</span>
          </div>
        {/each}
      {/if}
    </div>
  </Card>
  <Card class="sm:min-w-unset w-full  min-w-full max-w-80 overflow-hidden !p-0 sm:flex-1">
    <h4 class="bg-neutral-500/10 p-4 text-xl font-medium">
      {m['championship.personal_standing']()}
    </h4>
    <div
      class={[
        'aspect-1 flex w-full',
        loading ? 'items-center justify-center' : 'flex-col overflow-y-auto',
      ]}
    >
      {#if loading}
        <div class="text-text/60 dark:text-text-dark/60 pt-4 text-center text-sm italic">
          {m['championship.loading']()}
        </div>
      {:else}
        {#each personalStandings as standing (standing.player_id)}
          <div
            class="flex items-center justify-between border-b border-neutral-500/10 p-4 text-sm last:border-0"
          >
            <span>{standing.character_name}</span>
            <span>{standing.total_points}</span>
          </div>
        {/each}
      {/if}
    </div>
  </Card>
</div>
