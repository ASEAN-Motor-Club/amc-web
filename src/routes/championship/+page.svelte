<script lang="ts">
  import Lottie from '$lib/ui/Lottie/Lottie.svelte';
  import lottieSpark from '$lib/assets/lottie/sparkle.json';
  import Card from '$lib/ui/Card/Card.svelte';
  import Calendar from '$lib/components/Championship/Calendar.svelte';
  import { m } from '$lib/paraglide/messages';
  import EventModal from '$lib/components/Championship/EventModal.svelte';
  import { page } from '$app/state';
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { mappedEvents } from '$lib/data/event';
  import videoWebm from '$lib/assets/videos/videoplayback.webm';
  import videoMP4 from '$lib/assets/videos/videoplayback.mp4';

  const seasonNo = 2;

  let openedEventDay: number | undefined = $state(undefined);
  let openedEventMonth: number | undefined = $state(undefined);
  let openedEventYear: number | undefined = $state(undefined);

  const openEvent = (day: number, month: number, year: number) => {
    openedEventDay = day;
    openedEventMonth = month;
    openedEventYear = year;
  };

  const closeEvent = () => {
    openedEventDay = undefined;
    openedEventMonth = undefined;
    openedEventYear = undefined;
    goto(`?`, { replaceState: true, noScroll: true });
  };

  onMount(() => {
    const [year, month, day] = page.url.searchParams.get('date')?.split('-') ?? [];
    if (
      year &&
      month &&
      day &&
      (mappedEvents.get(+year)?.get(+month)?.get(+day) ?? []).length > 0
    ) {
      openedEventYear = +year;
      openedEventMonth = +month;
      openedEventDay = +day;
    } else {
      closeEvent();
    }
  });
</script>

<svelte:head>
  <title>{m['championship.head']({ siteName: m['site_name_short'](), seasonNo })}</title>
</svelte:head>

<div class="flex flex-col items-center">
  <div class="-mt-16 flex h-dvh w-full pt-16">
    <div class="relative flex w-full flex-col items-center justify-center px-8">
      <div class="-z-3 absolute h-full w-full bg-black"></div>
      <video autoplay loop muted class="-z-2 absolute h-full w-full object-cover">
        <source src={videoWebm} type="video/webm" />
        <source src={videoMP4} type="video/mp4" />
      </video>
      <div class="-z-1 absolute h-full w-full bg-black/50"></div>
      <div class="aspect-1 max-w-50 relative w-full">
        <div class="i-material-symbols:trophy-sharp h-full w-full text-amber-500"></div>
        <div class="absolute top-0 h-full w-full">
          <Lottie animationData={lottieSpark} loop autoplay speed={0.8} />
        </div>
      </div>
      <h3 class="pb-5 pt-8 font-semibold text-white">{m['championship.coming_soon']()}</h3>
      <h1 class="pb-8 text-center text-4xl font-bold tracking-tight text-white sm:text-7xl">
        {m['championship.title']()}
      </h1>
      <h2 class="text-2xl font-semibold text-white sm:text-3xl">
        {m['championship.season']({ seasonNo })}
      </h2>
    </div>
  </div>
  <div class="flex flex-col items-center p-8 pt-0">
    <h4 class="pt-18 pb-8 text-4xl font-semibold tracking-tight">Standing</h4>
    <div class="flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
      <Card class="max-w-120 overflow-hidden">
        <h4 class="-m-4 mb-0 bg-neutral-500/10 p-4 text-xl font-medium">
          {m['championship.team_standing']()}
        </h4>
        <div
          class="aspect-1 text-text/60 dark:text-text-dark/60 flex w-full items-center justify-center text-center text-sm italic"
        >
          {m['championship.coming_back']()}
        </div>
      </Card>
      <Card class="max-w-120 overflow-hidden">
        <h4 class="-m-4 mb-0 bg-neutral-500/10 p-4 text-xl font-medium">
          {m['championship.personal_standing']()}
        </h4>
        <div
          class="aspect-1 text-text/60 dark:text-text-dark/60 flex w-full items-center justify-center text-center text-sm italic"
        >
          {m['championship.coming_back']()}
        </div>
      </Card>
    </div>

    <h4 class="pt-18 pb-8 text-4xl font-semibold tracking-tight">{m['championship.schedule']()}</h4>
    <Calendar month={7} year={2025} onEventClick={openEvent} />
  </div>
</div>
<EventModal
  month={openedEventMonth}
  year={openedEventYear}
  day={openedEventDay}
  onClose={closeEvent}
/>
