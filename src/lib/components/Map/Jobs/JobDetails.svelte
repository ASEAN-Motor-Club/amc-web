<script lang="ts">
  import type { DeliveryJob } from '#lib/api/types.ts';
  import CommonHead from '#lib/components/CommonHead/CommonHead.svelte';
  import { formatDuration, getDateFnsLocale, intervalToDuration, isBefore } from '#lib/date.ts';
  import { rtDate } from '#lib/realtimeDate.svelte.ts';
  import TextSkeleton from '#lib/ui/TextSkeleton/TextSkeleton.svelte';
  import type { SvelteMap } from 'svelte/reactivity';
  import { m } from '#messages';
  import { getMtLocale } from '#lib/utils/getMtLocale.ts';
  import { cargoName } from '#lib/data/cargo.ts';
  import Card from '#lib/ui/Card/Card.svelte';

  import DeliveryLink from '../Delivery/DeliveryLink.svelte';
  import Divider from '#lib/ui/Divider/Divider.svelte';
  import { getJobValidPoints } from './validPoints.ts';
  import TruncateText from '#lib/ui/TruncateText/TruncateText.svelte';
  import Table from '#lib/ui/Table/Table.svelte';
  import TableHead from '#lib/ui/Table/TableHead.svelte';
  import TableRow from '#lib/ui/Table/TableRow.svelte';
  import TableEmptyState from '#lib/ui/Table/TableEmptyState.svelte';

  interface Props {
    id: string;
    loading: boolean;
    fullScreen: boolean;
    jobsCache: SvelteMap<number, DeliveryJob>;
  }

  const { id, loading, fullScreen, jobsCache }: Props = $props();

  const job: DeliveryJob | undefined = $derived.by(() => {
    if (loading) {
      return undefined;
    }
    return jobsCache.get(Number(id));
  });

  const expired = $derived.by(() => {
    if (!job) {
      return true;
    }
    return isBefore(job.expired_at, rtDate.d.getTime());
  });

  const timeLeftText = $derived.by(() => {
    if (!job) {
      return '';
    }

    // If rent has expired
    if (expired) {
      return m['jobs.expired']();
    }

    const time = rtDate.d.getTime();

    const duration = intervalToDuration({
      start: time,
      end: job.expired_at,
    });

    return (
      formatDuration(duration, { format: ['days', 'hours', 'minutes', 'seconds'] }) ||
      getDateFnsLocale().formatDistance('lessThanXSeconds', 1)
    );
  });

  const contributors = $derived.by(() => {
    if (!job) {
      return [];
    }

    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const contribMap = new Map<string, [name: string, quantity: number]>();
    for (const delivery of job.deliveries) {
      const [currentName, currentQuantity] = contribMap.get(delivery.character.player_id) ?? [
        delivery.character.name,
        0,
      ];
      contribMap.set(delivery.character.player_id, [
        currentName,
        currentQuantity + delivery.quantity,
      ]);
    }

    return Array.from(contribMap.entries()).map(([id, [name, quantity]]) => ({
      id,
      name,
      quantity,
    }));
  });

  const rewardPerQuantity = $derived.by(() => {
    if (!job) {
      return 0;
    }
    return job.completion_bonus / job.quantity_requested;
  });

  const validPoints = $derived(job ? getJobValidPoints(job) : { supply: [], demand: [] });
</script>

{#if job || loading}
  <div
    class={[
      'flex h-full flex-col gap-8 p-8',
      loading ? 'overflow-hidden' : 'overflow-y-auto',
      fullScreen && 'lg:flex-row',
    ]}
  >
    <div
      class={[
        'flex flex-1 flex-col',
        fullScreen &&
          (loading
            ? 'lg:overflow-hidden lg:overflow-x-hidden'
            : 'lg:overflow-x-hidden lg:overflow-y-auto'),
      ]}
    >
      <CommonHead class="w-full !p-0 !pb-8">
        {#if loading}
          <TextSkeleton class="w-full max-w-150" />
        {:else}
          {job?.name ?? ''}
        {/if}
      </CommonHead>
      <div class="mb-8 text-6xl font-bold tabular-nums">
        {#if loading}
          <TextSkeleton class="w-15" /> <span class="text-text-500">/</span>
          <TextSkeleton class="w-15" />
        {:else}
          {job?.quantity_fulfilled} <span class="text-text-500">/</span>
          {job?.quantity_requested}
        {/if}
      </div>
      <div class="mb-8 font-semibold text-text-700 dark:text-text-300">
        {#if loading}
          <TextSkeleton class="w-full max-w-50" />
        {:else}
          {timeLeftText}
        {/if}
      </div>
      <div class="mb-8 flex gap-8 text-text-700 dark:text-text-300">
        <div>
          <div class="text-sm font-semibold text-text-600 dark:text-text-400">
            {m['jobs.bonus_multiplier']()}
          </div>
          {#if loading}
            <TextSkeleton class="w-12" />
          {:else}
            {Math.round((job?.bonus_multiplier ?? 0) * 100)}%
          {/if}
        </div>
        <div>
          <div class="text-sm font-semibold text-text-600 dark:text-text-400">
            {m['jobs.completion_bonus']()}
          </div>
          {#if loading}
            <TextSkeleton class="w-12" />
          {:else}
            ${job?.completion_bonus}
          {/if}
        </div>
      </div>
      {#if job?.description}
        <div class="text-sm text-text-600 dark:text-text-400">
          {job.description}
        </div>
      {/if}
      <Divider spacing="lg" />
      <div class="text-text-700 dark:text-text-300">
        {#if loading}
          <TextSkeleton class="mt-2 w-full" lines={8} />
        {:else}
          <div class="mb-4">
            <div class="font-semibold text-text-600 dark:text-text-400">
              {m['jobs.constrains_cargo']()}
            </div>
            <ul
              class={['list-disc marker:text-text-500', fullScreen && 'lg:columns-2 2xl:columns-3']}
            >
              {#each job?.cargos ?? [] as cargo (cargo)}
                <li class="ml-8">{getMtLocale(cargoName[cargo])}</li>
              {/each}
            </ul>
          </div>
          {#if validPoints.supply.length > 0}
            <div class="mb-4">
              <div class="font-semibold text-text-600 dark:text-text-400">
                {m['jobs.job_supply']()}
              </div>
              <ul
                class={[
                  'list-disc marker:text-text-500',
                  fullScreen && 'lg:columns-2 2xl:columns-3',
                ]}
              >
                {#each validPoints.supply as point (point.guid)}
                  <li class="ml-8">
                    <DeliveryLink {fullScreen} guid={point.guid} truncate wrapperClass="w-full" />
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
          {#if validPoints.demand.length > 0}
            <div>
              <div class="font-semibold text-text-600 dark:text-text-400">
                {m['jobs.job_demand']()}
              </div>
              <ul
                class={[
                  'list-disc marker:text-text-500',
                  fullScreen && 'lg:columns-2 2xl:columns-3',
                ]}
              >
                {#each validPoints.demand as point (point.guid)}
                  <li class="ml-8">
                    <DeliveryLink {fullScreen} guid={point.guid} truncate wrapperClass="w-full" />
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        {/if}
      </div>
    </div>

    <div class={['flex flex-1', fullScreen && 'lg:max-w-100']}>
      <Card
        class="flex max-h-[calc(100dvh-11rem)] flex-1 flex-col overflow-hidden p-0 lg:max-h-[calc(100dvh-8rem)]"
      >
        <div class="bg-gray-500/10 p-4 font-semibold text-text-600 dark:text-text-400">
          {m['jobs.contributors']()}
        </div>
        <Table
          gridClass="grid-cols-[6fr_4rem_6rem]"
          skeletonCount={100}
          {loading}
          empty={contributors.length === 0}
        >
          {#snippet emptyState()}
            <TableEmptyState class="py-12">
              {m['jobs.no_contributors']()}
            </TableEmptyState>
          {/snippet}
          {#snippet head()}
            <TableHead>
              <div>
                {m['jobs.table.name']()}
              </div>
              <div class="text-right whitespace-nowrap">
                {m['jobs.table.amount']()}
              </div>
              <div class="text-right whitespace-nowrap">
                {m['jobs.table.reward_cut']()}
              </div>
            </TableHead>
          {/snippet}

          {#each contributors as contrib (contrib.id)}
            <TableRow>
              <TruncateText text={contrib.name} />
              <div class="text-right whitespace-nowrap">
                {contrib.quantity} ({Math.round(
                  (contrib.quantity / (job?.quantity_requested ?? 1)) * 100,
                )}%)
              </div>
              <div class="text-right whitespace-nowrap">
                ${Math.floor(rewardPerQuantity * contrib.quantity)}
              </div>
            </TableRow>
          {/each}
        </Table>
      </Card>
    </div>
  </div>
{:else}
  <div class="flex h-full items-center justify-center p-8 text-sm text-text-600 dark:text-text-400">
    {m['jobs.job_not_found']()}
  </div>
{/if}
