<script lang="ts">
  import Table from './Table.svelte';
  import TableRow from './TableRow.svelte';

  // @unocss-skip-start
  interface Props {
    loading?: boolean;
    empty?: boolean;
    gridClass?: `grid-cols-${number}` | `grid-cols-[${string}]`;
  }
  // @unocss-skip-end

  const { loading = false, empty = false, gridClass = 'grid-cols-4' }: Props = $props();
</script>

<Table skeletonCount={3} {gridClass} {loading} {empty}>
  {#snippet head()}
    <span>head-marker</span>
  {/snippet}
  {#snippet emptyState()}
    <span>empty-state-marker</span>
  {/snippet}
  <TableRow>
    <span>cell-a</span>
    <span>cell-b</span>
    <span>cell-c</span>
    <span>cell-d</span>
  </TableRow>
</Table>
