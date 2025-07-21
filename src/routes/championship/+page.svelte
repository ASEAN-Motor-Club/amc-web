<script lang="ts">
  import poster455 from '$lib/assets/images/poster/asean_poster_w455.avif';
  import poster909 from '$lib/assets/images/poster/asean_poster_w909.avif';
  import poster1364 from '$lib/assets/images/poster/asean_poster_w1364.avif';
  import poster1818 from '$lib/assets/images/poster/asean_poster_w1818.avif';
  import poster2727 from '$lib/assets/images/poster/asean_poster_w2727.avif';
  import poster3636 from '$lib/assets/images/poster/asean_poster_w3636.avif';
  import Standing from '$lib/components/Championship/Standing.svelte';
  import { m } from '$lib/paraglide/messages';

  import CalendarGroup from '$lib/components/Championship/CalendarGroup.svelte';
  import Teams from '$lib/components/Championship/Teams.svelte';

  const seasonNo = 2;
</script>

<svelte:head>
  <title>{m['championship.head']({ siteName: m['site_name_short'](), seasonNo })}</title>
</svelte:head>

<div class="flex flex-col items-center">
  <div class="-mt-16 h-dvh w-full pt-16">
    <div class="flex h-full w-full flex-col items-center justify-center p-8">
      <div class="max-w-250 flex-shrink-1 min-h-0 w-full">
        <img
          srcset={`${poster455} 455w, ${poster909} 909w, ${poster1364} 1364w, ${poster1818} 1818w, ${poster2727} 2727w, ${poster3636} 3636w`}
          alt="ASEAN Poster"
          class="aspect-ratio-1818/1162 h-full w-full object-contain"
          fetchpriority="high"
        />
      </div>
      <h3 class="pb-5 pt-8 font-semibold">{m['championship.coming_soon']()}</h3>
      <h1 class="pb-8 text-center text-4xl font-bold tracking-tight sm:text-7xl">
        {m['championship.title']()}
      </h1>
      <h2 class="text-2xl font-semibold sm:text-3xl">
        {m['championship.season']({ seasonNo })}
      </h2>
    </div>
  </div>
  <div class="flex w-full flex-col items-center p-8 pt-0">
    <Teams />
    <Standing />
    <CalendarGroup />
  </div>
</div>
