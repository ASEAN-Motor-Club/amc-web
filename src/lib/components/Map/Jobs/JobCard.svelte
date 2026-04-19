<script lang="ts">
  import Card from '$lib/ui/Card/Card.svelte';
  import type { DeliveryJob } from '$lib/api/types';
  import { formatDistanceStrict, isBefore } from '$lib/date';
  import { m } from '$messages';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import { cargoName } from '$lib/data/cargo';
  import { rtDate } from '$lib/realtimeDate.svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import { DetailsFeatures, getLinkHref } from '../utils';
  import DeliveryLink from '../Delivery/DeliveryLink.svelte';
  import TruncateText from '$lib/ui/TruncateText/TruncateText.svelte';

  export interface Props {
    job?: DeliveryJob;
    fullScreen: boolean;
    loading?: boolean;
  }

  const { job, fullScreen, loading }: Props = $props();

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

    // If job has expired
    if (expired) {
      return m['jobs.expired']();
    }

    const time = rtDate.d.getTime();

    return formatDistanceStrict(job.expired_at, time, {
      roundingMethod: 'floor',
    });
  });
</script>

<Card class={['relative flex flex-col overflow-hidden', expired && 'opacity-50']} {loading}>
  <TruncateText text={job?.name ?? '.'} class="mb-2 text-lg font-semibold" />
  <div class="mb-2 text-3xl font-bold tabular-nums">
    {job?.quantity_fulfilled} <span class="text-text-500">/</span>
    {job?.quantity_requested}
  </div>
  <div class="text-text-700 dark:text-text-300 mb-2 flex justify-between gap-1 text-sm">
    <div>
      <div class="text-text-500 text-xs font-bold">Time Left</div>
      <div>
        {timeLeftText}
      </div>
    </div>
    <div class="text-center">
      <div class="text-text-500 text-xs font-bold">{m['jobs.bonus_multiplier']()}</div>
      <div>
        {Math.round((job?.bonus_multiplier ?? 0) * 100)}%
      </div>
    </div>
    <div class="text-right">
      <div class="text-text-500 text-xs font-bold">{m['jobs.completion_bonus']()}</div>
      <div>
        ${job?.completion_bonus}
      </div>
    </div>
  </div>
  <div class="text-text-700 dark:text-text-300 mb-2 text-sm">
    <div class="text-text-500 text-xs font-bold">{m['jobs.constrains_cargo']()}</div>
    <div class="mb-2">
      {job?.cargos.map((point) => getMtLocale(cargoName[point])).join(', ')}
    </div>
    {#if job?.source_points && job.source_points.length > 0}
      <div class="text-text-500 text-xs font-bold">{m['jobs.constrains_source_points']()}</div>
      <div class="mb-2">
        {#each job.source_points as point, i (point)}
          <DeliveryLink {fullScreen} guid={point} />{i < job.source_points.length - 1
            ? ', '
            : ''}
        {/each}
      </div>
    {/if}
    {#if job?.destination_points && job.destination_points.length > 0}
      <div class="text-text-500 text-xs font-bold">{m['jobs.constrains_destination_points']()}</div>
      <div class="mb-2">
        {#each job.destination_points as point, i (point)}
          <DeliveryLink {fullScreen} guid={point} />{i < job.destination_points.length - 1
            ? ', '
            : ''}
        {/each}
      </div>
    {/if}
  </div>
  {#if job?.description}
    <div class="text-text-600 dark:text-text-400 mb-2 text-sm">
      {job.description}
    </div>
  {/if}
  <div class="flex-1"></div>
  <div class="-m-2 mt-0.5">
    <Button
      variant="text"
      tag="a"
      href={getLinkHref(fullScreen, DetailsFeatures.Jobs, job?.id ?? -1)}
      color="primary"
      size="sm"
    >
      {m['championship.event.more_info']()}
    </Button>
  </div>
</Card>
