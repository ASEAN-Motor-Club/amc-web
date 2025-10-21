<script lang="ts">
  import type { DeliveryJob } from '$lib/api/types';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import { formatDuration, getDateFnsLocale, intervalToDuration, isBefore } from '$lib/date';
  import { createSvelteDate } from '$lib/svelteDate.svelte';
  import TextSkeleton from '$lib/ui/TextSkeleton/TextSkeleton.svelte';
  import type { SvelteMap } from 'svelte/reactivity';
  import { m as msg } from '$lib/paraglide/messages';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import { cargoName } from '$lib/data/cargo';
  import Card from '$lib/ui/Card/Card.svelte';
  import { censored } from '$lib/censored.svelte';
  import DeliveryLink from '../Delivery/DeliveryLink.svelte';

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

  const svelteDate = createSvelteDate();

  const expired = $derived.by(() => {
    if (!job) {
      return true;
    }
    return isBefore(job.expired_at, svelteDate.getTime());
  });

  const timeLeftText = $derived.by(() => {
    if (!job) {
      return '';
    }

    // If rent has expired
    if (expired) {
      return msg['jobs.expired']();
    }

    const time = svelteDate.getTime();

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
    const contribMap = new Map<number, [string, number]>();
    for (const delivery of job.deliveries) {
      const [currentName, currentQuantity] = contribMap.get(delivery.character.id) ?? [
        delivery.character.name,
        0,
      ];
      contribMap.set(delivery.character.id, [currentName, currentQuantity + delivery.quantity]);
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
</script>

{#if job || loading}
  <div class={['flex h-full flex-col gap-8 overflow-y-auto p-8', fullScreen && 'sm:flex-row']}>
    <div class="flex flex-1 flex-col">
      <CommonHead class="w-full !p-0 !pb-8">
        {#if loading}
          <TextSkeleton class="max-w-150 w-full" />
        {:else}
          {job?.name ?? ''}
        {/if}
      </CommonHead>
      <div class="mb-8 text-6xl font-bold tabular-nums">
        {#if loading}
          <TextSkeleton class="w-15" /> <span class="opacity-50">/</span>
          <TextSkeleton class="w-15" />
        {:else}
          {job?.quantity_fulfilled} <span class="opacity-50">/</span>
          {job?.quantity_requested}
        {/if}
      </div>
      <div class="mb-8 font-semibold">
        {#if loading}
          <TextSkeleton class="max-w-50 w-full" />
        {:else}
          {timeLeftText}
        {/if}
      </div>
      <div class="mb-8">
        <span class="font-semibold">{msg['jobs.bonus_multiplier']()}:</span>
        {#if loading}
          <TextSkeleton class="w-12" />
        {:else}
          {(job?.bonus_multiplier ?? 0) * 100}%
        {/if}
        <br />
        <span class="font-semibold">{msg['jobs.completion_bonus']()}:</span>
        {#if loading}
          <TextSkeleton class="w-12" />
        {:else}
          {job?.completion_bonus}
        {/if}
      </div>
      <div>
        <span class="text-base font-semibold">{msg['jobs.constrains']()}</span>
        <br />
        {#if loading}
          <TextSkeleton class="w-full" lines={3} />
        {:else}
          <span class="font-semibold">{msg['jobs.constrains_cargo']()}:</span>
          {job?.cargos.map((point) => getMtLocale(cargoName[point.key])).join(', ')}
          <br />
          {#if job?.source_points && job.source_points.length > 0}
            <span class="font-semibold">{msg['jobs.constrains_source_points']()}:</span>
            {#each job.source_points as point, i (point.guid)}
              <DeliveryLink {fullScreen} guid={point.guid} />{i < job.source_points.length - 1
                ? ', '
                : ''}
            {/each}
            <br />
          {/if}
          {#if job?.destination_points && job.destination_points.length > 0}
            <span class="font-semibold">{msg['jobs.constrains_destination_points']()}:</span>
            {#each job.destination_points as point, i (point.guid)}
              <DeliveryLink {fullScreen} guid={point.guid} />{i < job.destination_points.length - 1
                ? ', '
                : ''}
            {/each}
          {/if}
        {/if}
      </div>
      {#if job?.description}
        <div class="mt-8 text-sm opacity-85">
          {job.description}
        </div>
      {/if}
    </div>
    <div class="flex flex-1">
      <Card
        class="flex max-h-[calc(100dvh-11rem)] flex-1 flex-col overflow-hidden p-0 sm:max-h-[calc(100dvh-8rem)]"
      >
        <div class="bg-neutral-500/10 p-4 text-lg font-semibold">
          {msg['jobs.contributors']()}
        </div>
        <div class={['flex flex-1 flex-col', loading ? 'overflow-y-hidden' : 'overflow-y-auto']}>
          {#if loading}
            <div
              class="grid grid-cols-[6fr_4rem_6rem] gap-2 border-neutral-500/10 bg-neutral-500/5 px-4 py-2 text-sm font-semibold last:border-0"
            >
              <div>
                {msg['jobs.table.name']()}
              </div>
              <div class="whitespace-nowrap text-right">
                {msg['jobs.table.amount']()}
              </div>
              <div class="whitespace-nowrap text-right">
                {msg['jobs.table.reward_cut']()}
              </div>
            </div>
            {#each Array(100) as _, i (i)}
              <div
                class="grid grid-cols-[6fr_4rem_6rem] gap-2 border-b border-neutral-500/10 px-4 py-3 last:border-0"
              >
                <TextSkeleton />
                <TextSkeleton />
                <TextSkeleton />
              </div>
            {/each}
          {:else if contributors.length === 0}
            <div
              class="text-text/60 dark:text-text-dark/60 flex flex-1 items-center justify-center px-4 py-12 text-center text-sm italic"
            >
              {censored.c ? msg['jobs.no_contributors_c']() : msg['jobs.no_contributors']()}
            </div>
          {:else}
            <div
              class="grid grid-cols-[6fr_4rem_6rem] gap-2 border-neutral-500/10 bg-neutral-500/5 px-4 py-2 text-sm font-semibold last:border-0"
            >
              <div>
                {msg['jobs.table.name']()}
              </div>
              <div class="whitespace-nowrap text-right">
                {msg['jobs.table.amount']()}
              </div>
              <div class="whitespace-nowrap text-right">
                {msg['jobs.table.reward_cut']()}
              </div>
            </div>
            {#each contributors as contrib (contrib.id)}
              <div
                class="grid grid-cols-[6fr_4rem_6rem] gap-2 border-b border-neutral-500/10 px-4 py-3 last:border-0"
              >
                <div class="truncate">
                  {contrib.name}
                </div>
                <div class="whitespace-nowrap text-right">
                  {contrib.quantity} ({Math.round(
                    (contrib.quantity / (job?.quantity_requested ?? 1)) * 100,
                  )}%)
                </div>
                <div class="whitespace-nowrap text-right">
                  {Math.floor(rewardPerQuantity * contrib.quantity)}$
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </Card>
    </div>
  </div>
{:else}
  <div
    class="text-text/60 dark:text-text-dark/60 flex h-full items-center justify-center p-8 text-sm"
  >
    {censored.c ? msg['jobs.job_not_found_c']() : msg['jobs.job_not_found']()}
  </div>
{/if}
