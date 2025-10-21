<script lang="ts">
  import { page } from '$app/state';
  import Housing from '../Housing/Housing.svelte';
  import { slide } from 'svelte/transition';
  import { type SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';
  import { prefersReducedMotion } from 'svelte/motion';
  import { isSm } from '$lib/utils/media.svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import { clientSearchParams, clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import DeliveryDetails from '../Delivery/DeliveryDetails.svelte';
  import type { PlayerData } from '../Map/types';
  import Players from '../Players/Players.svelte';
  import Jobs from '../Jobs/Jobs.svelte';
  import type { DeliveryJob, HouseData } from '$lib/api/types';
  import JobDetails from '../Jobs/JobDetails.svelte';
  import { censored } from '$lib/censored.svelte';
  import CollapsibleContentWrapper from './CollapsibleContentWrapper.svelte';
  import CollapsibleButton from './CollapsibleButton.svelte';
  import CollapsibleActionButton from './CollapsibleActionButton.svelte';
  import type { CollapsibleType, CollapsibleTypeWithId } from '../types';

  interface Props {
    showFull: boolean;
    validOpenCollapsible: boolean;
    openCollapsible: CollapsibleType;
    openCollapsibleId: string;
    playerData: PlayerData[];
    playerDataLoading: boolean;
    houseData: HouseData | undefined;
    houseDataLoading: boolean;
    jobsData: DeliveryJob[];
    jobsDataLoading: boolean;
    jobsCache: SvelteMap<number, DeliveryJob>;
    onCenter: (point: [number, number]) => void;
  }

  const {
    showFull,
    validOpenCollapsible,
    openCollapsible,
    openCollapsibleId,
    playerData,
    playerDataLoading,
    houseData,
    houseDataLoading,
    jobsData,
    jobsDataLoading,
    jobsCache,
    onCenter,
  }: Props = $props();

  const getCollapsibleHref = (collapsible: CollapsibleType | CollapsibleTypeWithId) => {
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    if (showFull || !isSm.current) {
      newParams.delete('menu');
      const str = newParams.toString();
      return `/${collapsible}${str && `?${str}`}`;
    }
    newParams.set('menu', collapsible);
    return `?${newParams.toString()}`;
  };

  const toggleFullHref = $derived.by(() => {
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    if (showFull) {
      newParams.set('menu', page.url.pathname.slice(1));
      return `/map?${newParams.toString()}`;
    }
    newParams.delete('menu');
    const str = newParams.toString();
    return `/${clientSearchParamsGet('menu') ?? 'map'}${str && `?${str}`}`;
  });

  const closeHref = $derived.by(() => {
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.delete('menu');
    newParams.delete('hf');
    const str = newParams.toString();
    return `/map${str && `?${str}`}`;
  });

  let showFullAnimate = $state(showFull);
  $effect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    if (showFull) {
      showFullAnimate = true;
    } else {
      if (prefersReducedMotion.current) {
        showFullAnimate = false;
        return;
      }
      timeout = setTimeout(() => {
        showFullAnimate = false;
      }, 1000);
    }

    return () => {
      clearTimeout(timeout);
    };
  });

  const openCollapsibleClasses = 'sm:w-100 lg:w-120 xl:w-140';

  const showMapBtn = $derived(validOpenCollapsible && (!isSm.current || showFull));
</script>

{#if isSm.current && showFullAnimate}
  <div class={['h-full', validOpenCollapsible ? openCollapsibleClasses : 'sm:w-11']}></div>
{/if}
<div
  class={[
    'bg-background-300 dark:bg-background-950 z-1 absolute bottom-0  flex w-full flex-col sm:static sm:w-auto sm:flex-row',
    isSm.current && showFullAnimate && '!sm:absolute right-0 top-0',
  ]}
>
  <div class="z-1 flex w-full flex-row sm:h-full sm:w-11 sm:flex-col">
    {#if validOpenCollapsible && isSm.current && !showFull}
      <CollapsibleActionButton
        color="error"
        icon="i-material-symbols:close-rounded"
        href={closeHref}
      />
    {/if}
    {#if validOpenCollapsible}
      <CollapsibleActionButton
        color="info"
        class="hidden sm:flex"
        icon={showFull
          ? 'i-material-symbols:collapse-content-rounded'
          : 'i-material-symbols:expand-content-rounded'}
        href={toggleFullHref}
      />
    {/if}
    <div class="flex flex-1 flex-row sm:w-11 sm:flex-col">
      <div
        class={[
          'overflow-hidden transition-[width,height] duration-1000',
          showMapBtn ? 'h-12 w-1/4 sm:h-1/4 sm:w-full ' : 'h-full w-0 sm:h-0 sm:w-full',
        ]}
      >
        <CollapsibleButton
          class="h-full min-h-0 w-full min-w-12 hover:bg-green-700/10 hover:text-green-700 active:bg-green-800/20 sm:min-h-11 sm:min-w-0 hover:dark:text-green-500"
          icon="i-material-symbols:map-outline-rounded"
          text={msg['map.side_menu.map']()}
          href={closeHref}
        />
      </div>
      <CollapsibleButton
        class={[
          'h-12 flex-1 hover:bg-emerald-700/10 hover:text-emerald-700 active:bg-emerald-800/20 sm:w-full hover:dark:text-emerald-500',
          openCollapsible === 'players' &&
            'bg-emerald-800/20 text-emerald-700 dark:text-emerald-500',
        ]}
        icon="i-material-symbols:person-outline-rounded"
        text={msg['map.side_menu.players']()}
        href={getCollapsibleHref('players')}
      />
      <CollapsibleButton
        class={[
          'h-12 flex-1 hover:bg-blue-700/10 hover:text-blue-700 active:bg-blue-800/20 sm:w-full hover:dark:text-blue-500',
          openCollapsible === 'housing' && 'bg-blue-800/20 text-blue-700 dark:text-blue-500',
        ]}
        icon="i-material-symbols:home-outline-rounded"
        text={msg['map.side_menu.housing']()}
        href={getCollapsibleHref('housing')}
      />
      <CollapsibleButton
        class={[
          'h-12 flex-1 hover:bg-orange-700/10 hover:text-orange-700 active:bg-orange-800/20 sm:w-full hover:dark:text-orange-500',
          openCollapsible === 'jobs' && 'bg-orange-800/20 text-orange-700 dark:text-orange-500',
        ]}
        icon="i-material-symbols:delivery-truck-speed-outline-rounded"
        text={censored.c ? msg['map.side_menu.jobs_c']() : msg['map.side_menu.jobs']()}
        href={getCollapsibleHref('jobs')}
      />
    </div>
    {#if openCollapsible === 'deliveries' && openCollapsibleId}
      <div
        transition:slide={{
          duration: prefersReducedMotion.current ? 0 : 600,
          axis: isSm.current ? 'y' : 'x',
        }}
      >
        <CollapsibleButton
          class="sm:h-13 h-12 w-12 bg-yellow-800/20 text-yellow-700 hover:bg-yellow-700/10 hover:text-yellow-700 active:bg-yellow-800/20 sm:w-11 dark:text-yellow-500 hover:dark:text-yellow-500"
          icon="i-material-symbols:box-outline-rounded"
          text={msg['map.side_menu.delivery']()}
          href={getCollapsibleHref('deliveries/' + openCollapsibleId)}
        />
      </div>
    {/if}
  </div>
  <div
    class={[
      'overflow-hidden duration-1000 motion-safe:transition-[width,height] sm:-ml-11 sm:h-full sm:pl-11',
      validOpenCollapsible
        ? ['h-[calc(100dvh-7rem)] w-screen', !showFull && openCollapsibleClasses]
        : 'h-0 sm:w-0',
    ]}
  >
    {#if openCollapsible === 'housing'}
      <CollapsibleContentWrapper>
        <Housing {houseData} loading={houseDataLoading} fullScreen={showFull} />
      </CollapsibleContentWrapper>
    {:else if openCollapsible === 'players'}
      <CollapsibleContentWrapper>
        <Players {playerData} {playerDataLoading} fullScreen={showFull} {onCenter} />
      </CollapsibleContentWrapper>
    {:else if openCollapsible === 'jobs'}
      {#if openCollapsibleId}
        {#key openCollapsibleId}
          <CollapsibleContentWrapper>
            <JobDetails
              id={openCollapsibleId}
              {jobsCache}
              loading={jobsDataLoading}
              fullScreen={showFull}
            />
          </CollapsibleContentWrapper>
        {/key}
      {:else}
        <CollapsibleContentWrapper>
          <Jobs {jobsData} loading={jobsDataLoading} fullScreen={showFull} />
        </CollapsibleContentWrapper>
      {/if}
    {:else if openCollapsible === 'deliveries'}
      {#if openCollapsibleId}
        {#key openCollapsibleId}
          <CollapsibleContentWrapper>
            <DeliveryDetails id={openCollapsibleId} fullScreen={showFull} {jobsData} />
          </CollapsibleContentWrapper>
        {/key}
      {/if}
    {/if}
  </div>
</div>
