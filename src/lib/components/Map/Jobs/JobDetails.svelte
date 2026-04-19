<script lang="ts">
  import type { DeliveryJob } from '$lib/api/types';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import { formatDuration, getDateFnsLocale, intervalToDuration, isBefore } from '$lib/date';
  import { rtDate } from '$lib/realtimeDate.svelte';
  import TextSkeleton from '$lib/ui/TextSkeleton/TextSkeleton.svelte';
  import type { SvelteMap } from 'svelte/reactivity';
  import { m } from '$messages';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import { cargoName } from '$lib/data/cargo';
  import Card from '$lib/ui/Card/Card.svelte';

  import DeliveryLink from '../Delivery/DeliveryLink.svelte';
  import Divider from '$lib/ui/Divider/Divider.svelte';
  import { getMatchJobDestFn, getMatchJobSourceFn } from '$lib/utils/delivery';
  import { deliveryPoints } from '$lib/data/deliveryPoint';
  import TruncateText from '$lib/ui/TruncateText/TruncateText.svelte';
  import Table from '$lib/ui/Table/Table.svelte';
  import TableHead from '$lib/ui/Table/TableHead.svelte';
  import TableRow from '$lib/ui/Table/TableRow.svelte';
  import TableEmptyState from '$lib/ui/Table/TableEmptyState.svelte';

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
    const contribMap = new Map<string, [string, number]>();
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

  const validSupply = $derived.by(() => {
    if (!job) {
      return [];
    }
    return deliveryPoints.filter((point) => getMatchJobSourceFn(point)(job));
  });

  const validDemand = $derived.by(() => {
    if (!job) {
      return [];
    }
    return deliveryPoints.filter((point) => getMatchJobDestFn(point)(job));
  });
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
      <div class="text-text-700 dark:text-text-300 mb-8 font-semibold">
        {#if loading}
          <TextSkeleton class="w-full max-w-50" />
        {:else}
          {timeLeftText}
        {/if}
      </div>
      <div class="text-text-700 dark:text-text-300 mb-8 flex gap-8">
        <div>
          <div class="text-text-600 dark:text-text-400 text-sm font-semibold">
            {m['jobs.bonus_multiplier']()}
          </div>
          {#if loading}
            <TextSkeleton class="w-12" />
          {:else}
            {Math.round((job?.bonus_multiplier ?? 0) * 100)}%
          {/if}
        </div>
        <div>
          <div class="text-text-600 dark:text-text-400 text-sm font-semibold">
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
        <div class="text-text-600 dark:text-text-400 text-sm">
          {job.description}
        </div>
      {/if}
      <Divider spacing="lg" />
      <div class="text-text-700 dark:text-text-300">
        {#if loading}
          <TextSkeleton class="mt-2 w-full" lines={8} />
        {:else}
          <div class="mb-2">
            <div class="text-text-600 dark:text-text-400 font-semibold">
              {m['jobs.constrains_cargo']()}
            </div>
            <ul
              class={['marker:text-text-500 list-disc', fullScreen && 'lg:columns-2 2xl:columns-3']}
            >
              {#each job?.cargos ?? [] as cargo (cargo)}
                <li class="ml-8">{getMtLocale(cargoName[cargo])}</li>
              {/each}
            </ul>
          </div>
          {#if job?.source_points && job.source_points.length > 0}
            <div class="mb-2">
              <div class="text-text-600 dark:text-text-400 font-semibold">
                {m['jobs.constrains_source_points']()}
              </div>
              <ul
                class={[
                  'marker:text-text-500 list-disc',
                  fullScreen && 'lg:columns-2 2xl:columns-3',
                ]}
              >
                {#each job.source_points as point (point)}
                  <li class="ml-8">
                    <DeliveryLink {fullScreen} guid={point} truncate wrapperClass="w-full" />
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
          {#if job?.destination_points && job.destination_points.length > 0}
            <div>
              <div class="text-text-600 dark:text-text-400 font-semibold">
                {m['jobs.constrains_destination_points']()}
              </div>
              <ul
                class={[
                  'marker:text-text-500 list-disc',
                  fullScreen && 'lg:columns-2 2xl:columns-3',
                ]}
              >
                {#each job.destination_points as point (point)}
                  <li class="ml-8">
                    <DeliveryLink {fullScreen} guid={point} truncate wrapperClass="w-full" />
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
        {/if}
      </div>
      <Divider spacing="lg" />
      <div>
        {#if loading}
          <TextSkeleton class="mt-2 w-full" lines={8} />
        {:else}
          {#if validSupply.length > 0}
            <div class="mb-4">
              <div class="text-text-600 dark:text-text-400 font-semibold">
                {m['jobs.job_supply']()}
              </div>
              <ul
                class={[
                  'marker:text-text-500 list-disc',
                  fullScreen && 'lg:columns-2 2xl:columns-3',
                ]}
              >
                {#each validSupply as point (point.guid)}
                  <li class="ml-8">
                    <DeliveryLink {fullScreen} guid={point.guid} truncate wrapperClass="w-full" />
                  </li>
                {/each}
              </ul>
            </div>
          {/if}
          {#if validDemand.length > 0}
            <div>
              <div class="text-text-600 dark:text-text-400 font-semibold">
                {m['jobs.job_demand']()}
              </div>
              <ul
                class={[
                  'marker:text-text-500 list-disc',
                  fullScreen && 'lg:columns-2 2xl:columns-3',
                ]}
              >
                {#each validDemand as point (point.guid)}
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
        <div class="text-text-600 dark:text-text-400 bg-gray-500/10 p-4 font-semibold">
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
  <div class="text-text-600 dark:text-text-400 flex h-full items-center justify-center p-8 text-sm">
    {m['jobs.job_not_found']()}
  </div>
{/if}
