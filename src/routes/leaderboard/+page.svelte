<script lang="ts">
  import { m } from '$messages';
  import Card from '$lib/ui/Card/Card.svelte';
  import Table from '$lib/ui/Table/Table.svelte';
  import TableHead from '$lib/ui/Table/TableHead.svelte';
  import TableRow from '$lib/ui/Table/TableRow.svelte';
  import TableEmptyState from '$lib/ui/Table/TableEmptyState.svelte';
  import TruncateText from '$lib/ui/TruncateText/TruncateText.svelte';

  interface LeaderboardEntry {
    playerId: number;
    name: string;
    deliveries: number;
    points: number;
  }

  // POC only: mock data stands in for a real standings query.
  const entries: LeaderboardEntry[] = [
    { playerId: 1, name: 'Beam41', deliveries: 132, points: 9840 },
    { playerId: 2, name: 'Yuuka', deliveries: 118, points: 9125 },
    { playerId: 3, name: 'Freeman', deliveries: 104, points: 8670 },
    { playerId: 4, name: 'Meehoi', deliveries: 97, points: 8015 },
    { playerId: 5, name: 'YOUYU', deliveries: 81, points: 7240 },
    { playerId: 6, name: 'WickedHaze', deliveries: 63, points: 5980 },
  ];

  const loading = false;
  const empty = entries.length === 0;

  const title = $derived(
    m['leaderboard.head']({
      siteName: m.site_name_short(),
    }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>

<div class="flex h-full w-full p-8">
  <div class="relative flex h-full w-full flex-col items-center">
    <h1 class="mt-2 mb-10 text-4xl font-bold tracking-tight">
      {m['leaderboard.title']()}
    </h1>
    <Card class="flex w-full max-w-4xl flex-1 flex-col overflow-hidden p-0">
      <div class="flex shrink-0 items-center gap-4 p-4">
        <div class="min-w-0 flex-1">
          <p class="text-text-600 dark:text-text-400 text-sm">
            {m['leaderboard.description']()}
          </p>
        </div>
      </div>
      <div class="flex min-h-0 flex-1 flex-col px-2 pb-2">
        <Table {loading} {empty} skeletonCount={8} gridClass="grid-cols-[3rem_1fr_6rem_6rem]">
          {#snippet head()}
            <TableHead>
              <div>{m['leaderboard.rank']()}</div>
              <div>{m['leaderboard.player']()}</div>
              <div class="text-right">{m['leaderboard.deliveries']()}</div>
              <div class="text-right">{m['leaderboard.points']()}</div>
            </TableHead>
          {/snippet}
          {#snippet emptyState()}
            <TableEmptyState>
              {m['leaderboard.no_entries']()}
            </TableEmptyState>
          {/snippet}
          {#each entries as entry, index (entry.playerId)}
            <TableRow>
              <div class="font-semibold">{index + 1}</div>
              <TruncateText text={entry.name}>
                {entry.name}
              </TruncateText>
              <div class="text-right">{entry.deliveries}</div>
              <div class="text-right font-bold">{entry.points}</div>
            </TableRow>
          {/each}
        </Table>
      </div>
    </Card>
  </div>
</div>
