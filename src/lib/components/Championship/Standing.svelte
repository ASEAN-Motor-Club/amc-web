<script lang="ts">
  import Card from '$lib/ui/Card/Card.svelte';
  import { m as msg } from '$lib/paraglide/messages';
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
  {msg['championship.standing']()}
</h4>
<div
  class="-my-8 flex w-full flex-row items-center gap-4 overflow-x-auto p-8 sm:m-0 sm:my-0 sm:justify-center sm:overflow-x-visible"
>
  <Card class="sm:min-w-unset max-w-100 w-full min-w-full overflow-hidden p-0 sm:flex-1">
    <h4 class="bg-neutral-500/10 p-4 text-xl font-medium">
      {msg['championship.team_standing']()}
    </h4>
    <div
      class={[
        'aspect-1 flex w-full',
        loading ? 'items-center justify-center' : 'flex-col overflow-y-auto',
      ]}
    >
      {#if loading}
        <div class="text-text/60 dark:text-text-dark/60 pt-4 text-center text-sm italic">
          {msg['championship.loading']()}
        </div>
      {:else}
        {#each teamStandings as standing, index (standing.team_id)}
          <div
            class={[
              'grid grid-cols-[1fr_6fr_1fr] border-b border-neutral-500/10 px-4 py-3 last:border-0',
              {
                'text-amber-600 dark:text-amber-500': index === 0,
                'text-gray-700 dark:text-gray-400': index === 1,
                'text-amber-700 dark:text-amber-600': index === 2,
              },
            ]}
          >
            <div>{index + 1}</div>
            <div class="truncate">
              <span class="font-bold">[{standing.team_tag}]</span>
              {standing.team_name}
            </div>
            <div class="text-right font-bold">{standing.total_points}</div>
          </div>
        {/each}
      {/if}
    </div>
  </Card>
  <Card class="sm:min-w-unset max-w-100 w-full min-w-full overflow-hidden !p-0 sm:flex-1">
    <h4 class="bg-neutral-500/10 p-4 text-xl font-medium">
      {msg['championship.personal_standing']()}
    </h4>
    <div
      class={[
        'aspect-1 flex w-full',
        loading ? 'items-center justify-center' : 'flex-col overflow-y-auto',
      ]}
    >
      {#if loading}
        <div class="text-text/60 dark:text-text-dark/60 pt-4 text-center text-sm italic">
          {msg['championship.loading']()}
        </div>
      {:else}
        {#each personalStandings as standing, index (standing.player_id)}
          <div
            class={[
              'grid grid-cols-[1fr_6fr_1fr] border-b border-neutral-500/10 px-4 py-3 last:border-0',
              {
                'text-amber-600 dark:text-amber-500': index === 0,
                'text-gray-700 dark:text-gray-400': index === 1,
                'text-amber-700 dark:text-amber-600': index === 2,
              },
            ]}
          >
            <div>{index + 1}</div>
            <div class="truncate">{standing.character_name}</div>
            <div class="text-right font-bold">
              {standing.total_points}
            </div>
          </div>
        {/each}
      {/if}
    </div>
  </Card>
</div>
