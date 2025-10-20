<script lang="ts">
  import type { DeliveryJob } from '$lib/api/types';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import { formatDuration, getDateFnsLocale, intervalToDuration, isBefore } from '$lib/date';
  import { createSvelteDate } from '$lib/svelteDate.svelte';
  import TextSkeleton from '$lib/ui/TextSkeleton/TextSkeleton.svelte';
  import { type SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';
  import { m as msg } from '$lib/paraglide/messages';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import { deliveryPointsMap } from '$lib/data/deliveryPoint';
  import { cargoName } from '$lib/data/cargo';
  import { clientSearchParams } from '$lib/utils/clientSearchParamsGet';
  import Card from '$lib/ui/Card/Card.svelte';
  import { censored } from '$lib/censored.svelte';

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

  const getDeliveryPointHref = (guid: string) => {
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.delete('player');
    newParams.delete('house');
    newParams.set('delivery', guid);
    if (fullScreen) {
      newParams.delete('menu');
      return `/delivery/${guid}`;
    }
    newParams.set('menu', `delivery/${guid}`);
    return `?${newParams.toString()}`;
  };

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
          <TextSkeleton class="w-48" />
        {:else}
          {job?.quantity_fulfilled} <span class="opacity-50">/</span>
          {job?.quantity_requested}
        {/if}
      </div>
      <div class="mb-8 font-semibold">
        {timeLeftText}
      </div>
      <div class="mb-8">
        <span class="font-semibold">{msg['jobs.bonus_multiplier']()}:</span>
        {#if loading}
          <TextSkeleton class="w-12" />
        {:else}
          {(job?.bonus_multiplier ?? 0) * 100}%
        {/if}
        <br class="mb-1" />
        <span class="font-semibold">{msg['jobs.completion_bonus']()}:</span>
        {#if loading}
          <TextSkeleton class="w-12" />
        {:else}
          {job?.completion_bonus}
        {/if}
      </div>
      <div>
        <span class="text-base font-semibold">{msg['jobs.constrains']()}</span>
        <br class="mb-1" />
        {#if loading}
          <TextSkeleton class="w-full" lines={3} lineBreakClass="mb-1" />
        {:else}
          <span class="font-semibold">{msg['jobs.constrains_cargo']()}:</span>
          {job?.cargos.map((point) => getMtLocale(cargoName[point.key])).join(', ')}
          <br class="mb-1" />
          {#if job?.source_points && job.source_points.length > 0}
            <span class="font-semibold">{msg['jobs.constrains_source_points']()}:</span>
            {#each job.source_points as point, i (point.guid)}
              <a
                class="text-yellow-700 underline hover:text-yellow-600 dark:text-yellow-500 dark:hover:text-yellow-400"
                href={getDeliveryPointHref(point.guid)}
                >{getMtLocale(deliveryPointsMap.get(point.guid)?.name ?? {})}</a
              >{i < job.source_points.length - 1 ? ', ' : ''}
            {/each}
            <br class="mb-1" />
          {/if}
          {#if job?.destination_points && job.destination_points.length > 0}
            <span class="font-semibold">{msg['jobs.constrains_destination_points']()}:</span>
            {#each job.destination_points as point, i (point.guid)}
              <a
                class="text-yellow-700 underline hover:text-yellow-600 dark:text-yellow-500 dark:hover:text-yellow-400"
                href={getDeliveryPointHref(point.guid)}
                >{getMtLocale(deliveryPointsMap.get(point.guid)?.name ?? {})}</a
              >{i < job.destination_points.length - 1 ? ', ' : ''}
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
            {#each Array(100) as _, i (i)}
              <div
                class="flex justify-between gap-2 border-b border-neutral-500/10 px-4 py-3 last:border-0"
              >
                <div class="w-8/10">
                  <div class="w-full"><TextSkeleton class="w-full" /></div>
                </div>
                <div class="flex-1"><TextSkeleton class="w-full" /></div>
              </div>
            {/each}
          {:else if contributors.length === 0}
            <div
              class="text-text/60 dark:text-text-dark/60 flex flex-1 items-center justify-center px-4 py-12 text-center text-sm italic"
            >
              {censored.c ? msg['jobs.no_contributors_c']() : msg['jobs.no_contributors']()}
            </div>
          {:else}
            {#each contributors as contrib (contrib.id)}
              <div
                class="flex justify-between gap-2 border-b border-neutral-500/10 px-4 py-3 last:border-0"
              >
                <div class="flex flex-1 overflow-hidden whitespace-nowrap">
                  {contrib.name}
                </div>
                <div class="whitespace-nowrap">
                  {contrib.quantity}
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
