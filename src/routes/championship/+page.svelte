<script lang="ts">
  import Lottie from '$lib/ui/Lottie/Lottie.svelte';
  import lottieSpark from '$lib/assets/lottie/sparkle.json';
  import Standing from '$lib/components/Championship/Standing.svelte';
  import { m } from '$lib/paraglide/messages';
  import videoWebm from '$lib/assets/videos/videoplayback.webm';
  import videoMP4 from '$lib/assets/videos/videoplayback.mp4';
  import CalendarGroup from '$lib/components/Championship/CalendarGroup.svelte';
  import Teams from '$lib/components/Championship/Teams.svelte';

  const seasonNo = 2;
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
  <div class="flex w-full flex-col items-center p-8 pt-0">
    <Teams />
    <Standing />
    <CalendarGroup />
  </div>
</div>
