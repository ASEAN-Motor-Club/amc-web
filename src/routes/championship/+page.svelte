<script>
  import Lottie from '$lib/ui/Lottie/Lottie.svelte';
  import lottieSpark from '$lib/assets/lottie/sparkle.json';
  import Card from '$lib/ui/Card/Card.svelte';
  import Calendar from '$lib/components/Championship/Calendar.svelte';
  import { m } from '$lib/paraglide/messages';

  const seasonNo = 2;
</script>

<svelte:head>
  <title>{m['championship.head']({ siteName: m['site_name_short'](), seasonNo })}</title>
</svelte:head>

<div class="flex flex-col items-center p-8">
  <div class="aspect-1 max-w-50 relative mt-8 w-full">
    <div class="i-material-symbols:trophy-sharp h-full w-full text-amber-500"></div>
    <div class="absolute top-0 h-full w-full">
      <Lottie animationData={lottieSpark} loop autoplay />
    </div>
  </div>
  <h3 class="pb-5 pt-8 font-semibold">{m['championship.coming_soon']()}</h3>
  <h1 class="pb-8 text-center text-4xl font-bold tracking-tight sm:text-7xl">
    {m['championship.title']()}
  </h1>
  <h2 class="pb-18 text-2xl font-semibold sm:text-3xl">{m['championship.season']({ seasonNo })}</h2>

  <div class="pb-18 flex w-full flex-col items-center justify-center gap-4 sm:flex-row">
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

  <h4 class="pb-8 text-4xl font-semibold tracking-tight">{m['championship.schedule']()}</h4>
  <Calendar month={7} year={2025} />
</div>
