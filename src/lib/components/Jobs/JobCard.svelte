<script lang="ts">
  import Card from '$lib/ui/Card/Card.svelte';
  import type { DeliveryJob } from '$lib/api/types';
  import { formatDuration, intervalToDuration, isBefore } from '$lib/date';
  import { m as msg } from '$lib/paraglide/messages';
  import { SvelteDate, SvelteURLSearchParams } from 'svelte/reactivity';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import { cargoName } from '$lib/data/cargo';
  import type { DeliveryCargo } from '$lib/data/types';
  import { deliveryPointsMap } from '$lib/data/deliveryPoint';
  import { clientSearchParams } from '$lib/utils/clientSearchParamsGet';

  export interface Props {
    job?: DeliveryJob;
    fullScreen: boolean;
    loading?: boolean;
  }

  const { job, fullScreen, loading }: Props = $props();

  const date = new SvelteDate();

  $effect(() => {
    let animationId: number;

    const updateTime = () => {
      date.setTime(Date.now());
      animationId = requestAnimationFrame(updateTime);
    };

    animationId = requestAnimationFrame(updateTime);

    return () => {
      cancelAnimationFrame(animationId);
    };
  });

  const timeLeftText = $derived.by(() => {
    if (!job) {
      return '';
    }

    const time = date.getTime();

    // If rent has expired
    if (isBefore(job.expired_at, time)) {
      return msg['jobs.expired']();
    }

    const duration = intervalToDuration({
      start: time,
      end: job.expired_at,
    });

    return formatDuration(duration, { format: ['days', 'hours', 'minutes', 'seconds'] });
  });

  const getDeliveryPointHref = (guid: string) => {
    if (fullScreen) {
      return `/delivery/${guid}`;
    }
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.set('menu', `delivery/${guid}`);
    newParams.set('delivery', guid);
    return `?${newParams.toString()}`;
  };
</script>

<Card class="relative overflow-hidden" {loading}>
  <h2 class="mb-2 flex-1 truncate text-lg font-semibold">
    {#if loading}
      .
    {:else}
      {job?.name}
    {/if}
  </h2>
  <div class="mb-2 text-3xl font-bold tabular-nums">
    {job?.quantity_fulfilled} <span class="opacity-85">/</span>
    {job?.quantity_requested}
  </div>
  <div class="mb-2 text-sm font-semibold">
    {timeLeftText}
  </div>
  <div class="mb-2">
    <span class="font-semibold">{msg['jobs.bonus_multiplier']()}:</span>
    {(job?.bonus_multiplier ?? 0) * 100}%
    <br />
    <span class="font-semibold">{msg['jobs.completion_bonus']()}:</span>
    {job?.completion_bonus}
  </div>
  <div class="text-sm">
    <span class="text-base font-semibold">{msg['jobs.constrains']()}</span>
    <br />
    <span class="font-semibold">{msg['jobs.constrains_cargo']()}:</span>
    {job?.cargos
      .map((point) => getMtLocale(cargoName[point.key.replace('T::', '_T') as DeliveryCargo]))
      .join(', ')}
    <br />
    {#if job?.source_points && job.source_points.length > 0}
      <span class="font-semibold">{msg['jobs.constrains_source_points']()}:</span>
      {#each job.source_points as point, i (point.guid)}
        <a
          class="text-yellow-700 underline hover:text-yellow-600 dark:text-yellow-500 dark:hover:text-yellow-400"
          href={getDeliveryPointHref(point.guid)}
          >{getMtLocale(deliveryPointsMap.get(point.guid)?.name ?? {})}</a
        >{i < job.source_points.length - 1 ? ', ' : ''}
      {/each}
      <br />
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
      <br />
    {/if}
  </div>
  {#if job?.description}
    <div class="mt-2 text-sm opacity-85">
      {job.description}
    </div>
  {/if}
</Card>
