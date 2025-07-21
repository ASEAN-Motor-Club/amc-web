<script lang="ts">
  import TeamCard from './TeamCard.svelte';
  import { teamsRaceOnly } from '$lib/data/teams';
</script>

<h4 class="pt-18 pb-8 text-4xl font-semibold tracking-tight">Teams</h4>
<div class="flex w-full flex-wrap justify-evenly justify-items-center gap-8">
  {#each teamsRaceOnly as team (team.tag)}
    <TeamCard {team} />
  {/each}
</div>
