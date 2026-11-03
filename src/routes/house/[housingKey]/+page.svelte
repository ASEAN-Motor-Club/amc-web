<script lang="ts">
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { prefersReducedMotion } from 'svelte/motion';
  import { m } from '#messages';
  import { getLocale } from '#lib/paraglide/runtime.js';
  import { createHouseViewerQuery } from '#lib/api/houseViewer.ts';
  import { houses } from '#lib/data/house.ts';
  import { getMsgModalContext } from '#lib/components/MsgModal/context.ts';
  import HouseViewer from '#lib/components/HouseViewer/HouseViewer.svelte';
  import Button from '#lib/ui/Button/Button.svelte';
  import Icon from '#lib/ui/Icon/Icon.svelte';
  import TextSkeleton from '#lib/ui/TextSkeleton/TextSkeleton.svelte';

  const { showModal } = getMsgModalContext();

  const housingKey = $derived(page.params.housingKey);

  const houseQuery = createHouseViewerQuery(() => ({
    housingKey,
    // A refetch hands the viewer a new object and rebuilds the scene; once per visit is enough.
    options: { refetchOnWindowFocus: false },
  }));

  const data = $derived(houseQuery.data);
  // Rent price with the server's multiplier, same source and formula as the map and the housing list.
  const plot = $derived(houses.find((h) => h.name === data?.housingKey));
  const locale = $derived.by(getLocale);

  let autoRotate = $state(!prefersReducedMotion.current);

  // Order comes from the static plot list, not the live housing panel: that query is a network
  // round trip, which left the buttons missing on first paint and absent from the prerendered HTML
  // altogether. Alphabetical by plot key keeps the targets stable while the page is open, and
  // vacant plots stay in the rotation because they have a 3D view too.
  const plotKeys = houses.map((h) => h.name).toSorted();

  // Wraps at both ends, so the first plot's previous is the last one and vice versa.
  const neighbours = $derived.by(() => {
    const count = plotKeys.length;
    const index = housingKey ? plotKeys.indexOf(housingKey) : -1;
    if (count < 2) return undefined;
    return {
      previous: plotKeys[index < 0 ? count - 1 : (index - 1 + count) % count],
      next: plotKeys[(index + 1) % count],
    };
  });

  $effect(() => {
    if (housingKey && !houseQuery.isError) return;

    showModal({
      title: m['house_viewer.cannot_load.title'](),
      message: m['house_viewer.cannot_load.desc'](),
      cancelAction: () => {
        goto('/map');
      },
    });
  });

  // Same naming as the map tooltip and house card: who lives here, not the plot's key.
  const houseName = $derived(
    data?.ownerName
      ? m['housing.owned_house']({ owner: data.ownerName })
      : m['housing.vacant_house'](),
  );

  // The prerendered copy has no API data yet, so it names the plot by its key: that is what the
  // unfurler shows, and it keeps every shared link's embed distinct.
  const headName = $derived(
    data
      ? houseName
      : (housingKey ?? m['house_viewer.head_loading']({ siteName: m.site_name_short() })),
  );
  const title = $derived(
    m['house_viewer.head']({ house: headName, siteName: m.site_name_short() }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta property="og:title" content={title} />
  <meta name="twitter:title" content={title} />
</svelte:head>

<div class="flex h-[calc(100dvh-4rem)] flex-col">
  <div class="flex flex-wrap items-end gap-x-8 gap-y-2 px-6 pt-2 pb-3">
    <div class="flex flex-col gap-2">
      <Button
        tag="a"
        href="/map?house={encodeURIComponent(housingKey ?? '')}&hf={encodeURIComponent(
          housingKey ?? '',
        )}"
        variant="text"
        size="sm"
        class="-ml-1.5 self-start"
      >
        {#snippet prependIcon()}
          <Icon class="icon-[material-symbols--arrow-back-rounded]" size="sm" />
        {/snippet}
        {m['house_viewer.back_to_map']()}
      </Button>
      <h1 class="text-3xl font-bold tracking-tight">
        {#if data}
          {houseName}
        {:else}
          <TextSkeleton class="w-64" />
        {/if}
      </h1>
    </div>
    {#if data}
      <dl class="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div>
          <dt class="font-semibold text-text-600 dark:text-text-400">{m['house_viewer.plot']()}</dt>
          <dd>{data.housingKey}</dd>
        </div>
        <div>
          <dt class="font-semibold text-text-600 dark:text-text-400">{m['house_viewer.size']()}</dt>
          <dd>{data.size.x / 100} x {data.size.y / 100}</dd>
        </div>
        {#if plot}
          <div>
            <dt class="font-semibold text-text-600 dark:text-text-400">
              {m['housing.rent_price']()}
            </dt>
            <dd>{(plot.cost / 10).toLocaleString(locale)}</dd>
          </div>
        {/if}
        <div>
          <dt class="font-semibold text-text-600 dark:text-text-400">
            {m['house_viewer.buildings']()}
          </dt>
          <dd>{data.buildings.length}</dd>
        </div>
      </dl>
    {/if}
    <div class="ml-auto flex flex-wrap gap-2">
      {#if neighbours}
        <Button
          tag="a"
          href="/house/{encodeURIComponent(neighbours.previous)}"
          variant="outlined"
          size="sm"
        >
          {#snippet prependIcon()}
            <Icon class="icon-[material-symbols--chevron-left-rounded]" size="sm" />
          {/snippet}
          {m['house_viewer.previous_house']()}
        </Button>
        <Button
          tag="a"
          href="/house/{encodeURIComponent(neighbours.next)}"
          variant="outlined"
          size="sm"
        >
          {#snippet appendIcon()}
            <Icon class="icon-[material-symbols--chevron-right-rounded]" size="sm" />
          {/snippet}
          {m['house_viewer.next_house']()}
        </Button>
      {/if}
      <!-- Toggling while loading is kept: the viewer starts with whatever autoRotate holds. -->
      <Button
        variant="outlined"
        size="sm"
        onClick={() => {
          autoRotate = !autoRotate;
        }}
      >
        {#snippet prependIcon()}
          <Icon
            class={autoRotate
              ? 'icon-[material-symbols--pause-rounded]'
              : 'icon-[material-symbols--play-arrow-rounded]'}
            size="sm"
          />
        {/snippet}
        {autoRotate ? m['house_viewer.pause_rotation']() : m['house_viewer.resume_rotation']()}
      </Button>
    </div>
  </div>
  <div
    class="relative min-h-0 flex-1 bg-gradient-to-b from-sky-200 to-slate-100 dark:from-slate-900 dark:to-slate-800"
    aria-busy={!data}
  >
    {#if data}
      <HouseViewer
        {data}
        {autoRotate}
        onUserControl={() => {
          // Taking the camera means looking at something; don't swing it away.
          autoRotate = false;
        }}
      />
    {/if}
  </div>
</div>
