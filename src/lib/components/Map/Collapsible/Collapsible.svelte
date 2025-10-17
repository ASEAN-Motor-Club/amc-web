<script lang="ts">
  import { page } from '$app/state';
  import Button from '$lib/ui/Button/Button.svelte';
  import Housing from './Housing.svelte';
  import { defaultTransitionDurationMs } from '$lib/tw-var';
  import { fade, slide } from 'svelte/transition';
  import { SvelteURLSearchParams } from 'svelte/reactivity';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import { prefersReducedMotion } from 'svelte/motion';
  import { isSm } from '$lib/utils/media.svelte';
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import { clientSearchParams, clientSearchParamsGet } from '$lib/utils/clientSearchParamsGet';
  import Delivery from './Delivery.svelte';

  const [openCollapsible, openCollapsibleId] = $derived.by(() => {
    switch (page.url.pathname.split('/')[1]) {
      case 'housing':
        return ['housing', ''];
      case 'jobs':
        return ['jobs', ''];
      case 'delivery':
        return ['delivery', page.params.id ?? ''];
      default: {
        const [menu, id] = (clientSearchParamsGet('menu') ?? '').split('/');
        return [menu, id];
      }
    }
  });

  const showFull = $derived.by(() => {
    const path = page.url.pathname.split('/')[1];
    return ['housing', 'jobs', 'delivery'].includes(path);
  });

  const validOpenCollapsible = $derived(['housing', 'jobs', 'delivery'].includes(openCollapsible));
  const getCollapsibleHref = (collapsible: string) => {
    if (showFull) {
      return `/${collapsible}`;
    }
    const newParams = new SvelteURLSearchParams(clientSearchParams());
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
    return `/${clientSearchParamsGet('menu') ?? 'map'}?${newParams.toString()}`;
  });

  const closeHref = $derived.by(() => {
    const newParams = new SvelteURLSearchParams(clientSearchParams());
    newParams.delete('menu');
    newParams.delete('hf');
    const str = newParams.toString();
    return `/map${str ? `?${str}` : ''}`;
  });

  // svelte-ignore state_referenced_locally
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
</script>

{#if showFullAnimate}
  <div class={['h-full', validOpenCollapsible ? openCollapsibleClasses : 'sm:w-11']}></div>
{/if}
<div
  class={[
    'bg-background-300 dark:bg-background-950 z-1 absolute bottom-0  flex w-full flex-col sm:static sm:w-auto sm:flex-row',
    showFullAnimate && '!sm:absolute right-0 top-0',
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
              'i-material-symbols:chevron-left-rounded transition-transform duration-1000',
              showFull ? 'rotate-180' : 'rotate-0',
            ]}
          />
        </Button>
      </div>
    {/if}
    {#if validOpenCollapsible && (!isSm.current || showFull)}
      <Button
        class="sm:h-unset h-12 flex-1 flex-col rounded-none bg-neutral-500/10 px-1 text-[9px] font-normal hover:bg-green-700/10 hover:text-green-700 active:bg-green-800/20 hover:dark:text-green-500"
        variant="contained-light"
        tag="a"
        href="/map"
      >
        <Icon class="i-material-symbols:map-outline-rounded" />
        <span class="truncate">{siteLocale.msg['map.side_menu.map']()}</span>
      </Button>
    {/if}
    <Button
      class={[
        'sm:h-unset h-12 flex-1 flex-col rounded-none bg-neutral-500/10 px-1 text-[9px] font-normal hover:bg-blue-700/10 hover:text-blue-700 active:bg-blue-800/20 hover:dark:text-blue-500',
        openCollapsible === 'housing' && 'bg-blue-800/20 text-blue-700 dark:text-blue-500',
      ]}
      variant="contained-light"
      tag="a"
      href={getCollapsibleHref('housing')}
    >
      <Icon class="i-material-symbols:home-outline-rounded" />
      <span class="truncate">{siteLocale.msg['map.side_menu.housing']()}</span>
    </Button>
    <!-- <Button
      class={[
        'sm:h-unset h-12 flex-1 flex-col truncate rounded-none bg-neutral-500/10 px-1 text-[9px] font-normal hover:bg-orange-700/10 hover:text-orange-700 active:bg-orange-800/20 hover:dark:text-orange-500',
        openCollapsible === 'jobs' && 'bg-orange-800/20 text-orange-700 dark:text-orange-500',
      ]}
      variant="contained-light"
      tag="a"
      href={getCollapsibleHref('jobs')}
    >
      <Icon class="i-material-symbols:delivery-truck-speed-outline-rounded" />
      <span class="truncate">{siteLocale.msg['map.side_menu.jobs']()}</span>
    </Button> -->
  </div>
  <div
    class={[
      'overflow-hidden duration-1000 motion-safe:transition-[width,height] sm:-ml-11 sm:h-full sm:pl-11',
      validOpenCollapsible
        ? ['h-[calc(100dvh-112px)] w-screen', !showFull && openCollapsibleClasses]
        : 'h-0 sm:w-0',
    ]}
  >
    {#if openCollapsible === 'housing'}
      <div
        class="sm:min-w-89 lg:min-w-109 xl:min-w-129 h-full"
        transition:fade={{ duration: defaultTransitionDurationMs }}
      >
        <Housing fullScreen={showFull} />
      </div>
    {:else if openCollapsible === 'delivery'}
      {#if openCollapsibleId}
        {#key openCollapsibleId}
          <div
            class="sm:min-w-89 lg:min-w-109 xl:min-w-129 h-full"
            transition:fade={{ duration: defaultTransitionDurationMs }}
          >
            <Delivery id={openCollapsibleId} fullScreen={showFull} />
          </div>
        {/key}
      {/if}
    {/if}
  </div>
</div>
