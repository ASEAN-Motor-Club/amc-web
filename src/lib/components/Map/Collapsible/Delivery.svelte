<script lang="ts">
  import { startDeliveryPointPolling } from '$lib/api/delivery';
  import type { DeliveryJob, DeliveryPointInfo } from '$lib/api/types';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import { cargoName } from '$lib/data/cargo';
  import { deliveryPointsMap, type DeliveryPoint } from '$lib/data/deliveryPoint';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import { getInventoryAmount as utilGetInventoryAmount } from '$lib/utils/getInventoryAmount';
  import type { DeliveryCargo } from '$lib/data/types';
  import { clientSearchParams } from '$lib/utils/clientSearchParamsGet';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import Card from '$lib/ui/Card/Card.svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import { differenceInSeconds, formatDistanceStrict, min } from '$lib/date';
  import { createSvelteDate } from '$lib/svelteDate.svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import { getMatchJobFn } from '$lib/utils/matchJob';

  interface Props {
    id: string;
    fullScreen: boolean;
    jobsData: DeliveryJob[];
  }

  const { id, fullScreen, jobsData }: Props = $props();

  let deliveryPointInfoLoading: boolean = $state(true);
  let deliveryPointInfo = $state<DeliveryPointInfo | undefined>(undefined);

  $effect(() => {
    deliveryPointInfoLoading = true;

    const stopPolling = startDeliveryPointPolling(id, (data) => {
      deliveryPointInfo = data;
      deliveryPointInfoLoading = false;
    });

    return () => {
      stopPolling();
    };
  });

  const deliveryPoint = $derived(deliveryPointsMap.get(id));

  const getInventoryAmount = (cargoKey: DeliveryCargo, isInput: boolean) =>
    utilGetInventoryAmount(deliveryPointInfo, cargoKey, isInput);

  const getDeliveryPointHref = (guid: string) => {
    if (fullScreen) {
      return `/delivery/${guid}`;
    }
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.set('menu', `delivery/${guid}`);
    newParams.set('delivery', guid);
    return `?${newParams.toString()}`;
  };

  const getJobHref = (_: number) => {
    if (fullScreen) {
      return `/jobs`;
    }
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.set('menu', `jobs`);
    return `?${newParams.toString()}`;
  };

  const findDropPoint = (cargoKey: DeliveryCargo) => {
    if (!deliveryPoint) return undefined;
    for (const dropGuid of deliveryPoint.dropPoint ?? []) {
      const dropPoint = deliveryPointsMap.get(dropGuid);
      if (dropPoint?.allDemand.includes(cargoKey)) {
        return dropPoint;
      }
    }
    return undefined;
  };

  const lastUpdated = $derived.by(() => {
    const curr = new Date();
    return min([deliveryPointInfo?.last_updated ?? curr, curr]);
  });

  const svelteDate = createSvelteDate();

  const matchJobs = $derived.by(() => {
    const info = deliveryPointsMap.get(id);
    if (!info) return [];
    return jobsData.filter(getMatchJobFn(info));
  });
</script>

<div class="flex h-full flex-col overflow-y-auto">
  <CommonHead class="pb-6 sm:pb-8">
    {getMtLocale(deliveryPoint?.name ?? {})}
  </CommonHead>
  <div class="px-8 pb-8 sm:hidden">
    <Button color="info" variant="contained-light" tag="a" href="/map?delivery={id}"
      >{msg.view_on_map()}</Button
    >
  </div>
  {#if deliveryPoint?.parent}
    <div class="px-8 pb-8">
      Drop point of <a
        href={getDeliveryPointHref(deliveryPoint.parent)}
        class="text-yellow-700 underline hover:text-yellow-600 dark:text-yellow-500 dark:hover:text-yellow-400"
        >{getMtLocale(deliveryPointsMap.get(deliveryPoint.parent)?.name ?? {})}</a
      >
    </div>
  {/if}
  {#if differenceInSeconds(svelteDate.getTime(), lastUpdated) > 30}
    <div class="px-8 pb-8 text-xs font-semibold text-red-500">
      {msg['delivery.last_updated']({
        time: formatDistanceStrict(lastUpdated, svelteDate.getTime(), {
          addSuffix: true,
        }),
      })}
    </div>
  {/if}

  {#if matchJobs.length > 0}
    <div class="px-8 pb-8">
      <Card class="flex-1 p-0">
        <div class="bg-neutral-500/10 p-4 text-lg font-semibold">
          {msg['jobs.title']()}
        </div>
        {#each matchJobs as job (job.id)}
          <div
            class="flex justify-between gap-2 border-b border-neutral-500/10 px-4 py-3 last:border-0"
          >
            <a
              href={getJobHref(job.id)}
              class="text-orange-600 underline hover:text-yellow-500 dark:text-orange-500 dark:hover:text-yellow-400"
              >{job.name}</a
            >
            <div class="whitespace-nowrap">
              {job.quantity_fulfilled}/{job.quantity_requested}
            </div>
          </div>
        {/each}
      </Card>
    </div>
  {/if}

  {#if deliveryPoint}
    <div class={['flex flex-col gap-8 px-8 pb-8', fullScreen && 'sm:flex-row sm:gap-4']}>
      {#if deliveryPoint.allSupply.length > 0}
        <Card class="flex-1 p-0">
          <div class="bg-neutral-500/10 p-4 text-lg font-semibold">
            {msg['delivery.supply']()}
          </div>
          {#each deliveryPoint.allSupply as item (item)}
            <div
              class="flex justify-between gap-2 border-b border-neutral-500/10 px-4 py-3 last:border-0"
            >
              <div>{getMtLocale(cargoName[item])}</div>
              <div class="whitespace-nowrap">
                {#if deliveryPointInfoLoading}<span class="animate-pulse">...</span
                  >{:else}{getInventoryAmount(
                    item,
                    true,
                  )}{/if}{#if !item.startsWith('_T')}/{deliveryPoint.supplyStorage[item]}{/if}
              </div>
            </div>
          {/each}
        </Card>
      {/if}
      {#if deliveryPoint.allDemand.length > 0}
        <Card class="flex-1 p-0">
          <div class="bg-neutral-500/10 p-4 text-lg font-semibold">
            {msg['delivery.demand']()}
          </div>
          {#each deliveryPoint.allDemand as item (item)}
            <div
              class="flex justify-between gap-2 border-b border-neutral-500/10 px-4 py-3 last:border-0"
            >
              <div
                class="flex flex-1 items-center items-baseline overflow-hidden whitespace-nowrap"
              >
                {getMtLocale(cargoName[item])}
                {#snippet dropPointName(dropPoint: DeliveryPoint | undefined)}
                  {#if dropPoint}
                    <a
                      class="ml-2 truncate text-xs font-semibold text-yellow-700 underline hover:text-yellow-600 dark:text-yellow-500 dark:hover:text-yellow-400"
                      href={getDeliveryPointHref(dropPoint.guid)}
                    >
                      {getMtLocale(dropPoint.name)
                        .replace(getMtLocale(deliveryPoint.name), '')
                        .replace(/\s+/g, ' ')
                        .trim()}
                    </a>
                  {/if}
                {/snippet}
                {@render dropPointName(findDropPoint(item))}
              </div>
              <div class="whitespace-nowrap">
                {#if deliveryPointInfoLoading}<span class="animate-pulse">...</span
                  >{:else}{getInventoryAmount(
                    item,
                    true,
                  )}{/if}{#if !item.startsWith('_T')}/{deliveryPoint.demandStorage[item]}{/if}
              </div>
            </div>
          {/each}
        </Card>
      {/if}
    </div>
    <div class="px-8 pb-8 text-center italic opacity-50">Delivery data coming soon!</div>
    <!-- {#if deliveryPoint.allSupply.length > 0}
      <div class="mx-8 -mt-8 h-full flex-none py-8">
        <Card class="h-full p-0">
          <div class="bg-neutral-500/10 p-4 text-lg font-semibold">
            {msg['delivery.delivery']()}
          </div>
        </Card>
      </div>
    {/if} -->
  {/if}
</div>
