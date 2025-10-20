<script lang="ts">
  import { page } from '$app/state';
  import Button from '$lib/ui/Button/Button.svelte';
  import Housing from './Housing.svelte';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { fade, slide } from 'svelte/transition';
  import { type SvelteMap, SvelteURLSearchParams } from 'svelte/reactivity';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { isSm } from '$lib/utils/media.svelte';
  import { m as msg } from '$lib/paraglide/messages';
  import { clientSearchParams, clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import DeliveryDetails from './DeliveryDetails.svelte';
  import type { PlayerData } from '../Map/types';
  import Players from './Players.svelte';
  import Jobs from './Jobs.svelte';
  import type { DeliveryJob, HouseData } from '$lib/api/types';
  import JobDetails from './JobDetails.svelte';
  import { censored } from '$lib/censored.svelte';

  interface Props {
    showFull: boolean;
    validOpenCollapsible: boolean;
    openCollapsible: string;
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

  const getCollapsibleHref = (collapsible: string) => {
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    if (showFull || !isSm.current) {
      newParams.delete('menu');
      return `/${collapsible}`;
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
    return `/${clientSearchParamsGet('menu') ?? 'map'}${str ? `?${str}` : ''}`;
  });

  const closeHref = $derived.by(() => {
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.delete('menu');
    newParams.delete('hf');
    const str = newParams.toString();
    return `/map${str ? `?${str}` : ''}`;
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

  const mapBtnHref = $derived.by(() => {
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.delete('menu');
    const str = newParams.toString();
    return `/map${str ? `?${str}` : ''}`;
  });
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
      <div
        transition:slide={{
          duration: prefersReducedMotion.current ? 0 : 1000,
          axis: 'y',
        }}
      >
        <Button
          class="size-11 flex-none truncate rounded-none"
          icon
          variant="contained-light"
          color="error"
          tag="a"
          href={closeHref}
        >
          <Icon class="i-material-symbols:close-rounded" />
        </Button>
      </div>
    {/if}
    {#if validOpenCollapsible}
      <div
        transition:slide={{
          duration: prefersReducedMotion.current ? 0 : 1000,
          axis: isSm.current ? 'y' : 'x',
        }}
      >
        <Button
          class="hidden size-11 flex-none truncate rounded-none sm:flex"
          icon
          variant="contained-light"
          color="info"
          tag="a"
          href={toggleFullHref}
        >
          <Icon
            class={[
              showFull
                ? 'i-material-symbols:collapse-content-rounded'
                : 'i-material-symbols:expand-content-rounded',
            ]}
          />
        </Button>
      </div>
    {/if}
    <div class="flex flex-1 flex-row sm:w-11 sm:flex-col">
      <div
        class={[
          'overflow-hidden transition-[width,height] duration-1000',
          showMapBtn ? 'h-12 w-1/4 sm:h-1/4 sm:w-full ' : 'h-full w-0 sm:h-0 sm:w-full',
        ]}
      >
        <Button
          class="h-full min-h-0 w-full min-w-12 flex-col rounded-none bg-neutral-500/10 px-1 text-[0.625rem] font-normal transition hover:bg-green-700/10 hover:text-green-700 active:bg-green-800/20 sm:min-h-11 sm:min-w-0 hover:dark:text-green-500"
          variant="contained-light"
          tag="a"
          href={mapBtnHref}
        >
          <Icon class="i-material-symbols:map-outline-rounded" />
          <span class="truncate">{msg['map.side_menu.map']()}</span>
        </Button>
      </div>
      <Button
        class={[
          'h-12 flex-1 flex-col rounded-none bg-neutral-500/10 px-1 text-[0.625rem] font-normal transition hover:bg-emerald-700/10 hover:text-emerald-700 active:bg-emerald-800/20 sm:w-full hover:dark:text-emerald-500',
          openCollapsible === 'players' &&
            'bg-emerald-800/20 text-emerald-700 dark:text-emerald-500',
        ]}
        variant="contained-light"
        tag="a"
        href={getCollapsibleHref('players')}
      >
        <Icon class="i-material-symbols:person-outline-rounded" />
        <span class="truncate">{msg['map.side_menu.players']()}</span>
      </Button>
      <Button
        class={[
          'h-12 flex-1 flex-col rounded-none bg-neutral-500/10 px-1 text-[0.625rem] font-normal transition hover:bg-blue-700/10 hover:text-blue-700 active:bg-blue-800/20 sm:w-full hover:dark:text-blue-500',
          openCollapsible === 'housing' && 'bg-blue-800/20 text-blue-700 dark:text-blue-500',
        ]}
        variant="contained-light"
        tag="a"
        href={getCollapsibleHref('housing')}
      >
        <Icon class="i-material-symbols:home-outline-rounded" />
        <span class="truncate">{msg['map.side_menu.housing']()}</span>
      </Button>

      <Button
        class={[
          'sm:h-unset h-12 flex-1 flex-col truncate rounded-none bg-neutral-500/10 px-1 text-[0.625rem] font-normal hover:bg-orange-700/10 hover:text-orange-700 active:bg-orange-800/20 hover:dark:text-orange-500',
          openCollapsible === 'jobs' && 'bg-orange-800/20 text-orange-700 dark:text-orange-500',
        ]}
        variant="contained-light"
        tag="a"
        href={getCollapsibleHref('jobs')}
      >
        <Icon class="i-material-symbols:delivery-truck-speed-outline-rounded" />
        <span class="truncate"
          >{censored.c ? msg['map.side_menu.jobs_c']() : msg['map.side_menu.jobs']()}</span
        >
      </Button>
    </div>
    {#if openCollapsible === 'delivery' && openCollapsibleId}
      <div
        transition:slide={{
          duration: prefersReducedMotion.current ? 0 : 600,
          axis: isSm.current ? 'y' : 'x',
        }}
      >
        <Button
          class="sm:h-13 h-12 w-12 flex-col rounded-none bg-yellow-800/20 px-1 text-[0.625rem] font-normal text-yellow-700 hover:bg-yellow-700/10 hover:text-yellow-700 active:bg-yellow-800/20 sm:w-11 dark:text-yellow-500 hover:dark:text-yellow-500"
          variant="contained-light"
          tag="a"
          href={getCollapsibleHref('delivery/' + openCollapsibleId)}
        >
          <Icon class="i-material-symbols:box-outline-rounded" />
          <span class="truncate">{msg['map.side_menu.delivery']()}</span>
        </Button>
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
      <div
        class="sm:min-w-89 lg:min-w-109 xl:min-w-129 h-full duration-150"
        transition:fade={{ duration: defaultTransitionDurationMs }}
      >
        <Housing {houseData} loading={houseDataLoading} fullScreen={showFull} />
      </div>
    {:else if openCollapsible === 'players'}
      <div
        class="sm:min-w-89 lg:min-w-109 xl:min-w-129 h-full duration-150"
        transition:fade={{ duration: defaultTransitionDurationMs }}
      >
        <Players {playerData} {playerDataLoading} fullScreen={showFull} {onCenter} />
      </div>
    {:else if openCollapsible === 'jobs'}
      {#if openCollapsibleId}
        {#key openCollapsibleId}
          <div
            class="sm:min-w-89 lg:min-w-109 xl:min-w-129 h-full duration-150"
            transition:fade={{ duration: defaultTransitionDurationMs }}
          >
            <JobDetails
              id={openCollapsibleId}
              {jobsCache}
              loading={jobsDataLoading}
              fullScreen={showFull}
            />
          </div>
        {/key}
      {:else}
        <div
          class="sm:min-w-89 lg:min-w-109 xl:min-w-129 h-full duration-150"
          transition:fade={{ duration: defaultTransitionDurationMs }}
        >
          <Jobs {jobsData} loading={jobsDataLoading} fullScreen={showFull} />
        </div>
      {/if}
    {:else if openCollapsible === 'delivery'}
      {#if openCollapsibleId}
        {#key openCollapsibleId}
          <div
            class="sm:min-w-89 lg:min-w-109 xl:min-w-129 h-full duration-150"
            transition:fade={{ duration: defaultTransitionDurationMs }}
          >
            <DeliveryDetails id={openCollapsibleId} fullScreen={showFull} {jobsData} />
          </div>
        {/key}
      {/if}
    {/if}
  </div>
</div>
