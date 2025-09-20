<script lang="ts">
  import { siteLocale } from '$lib/components/Locale/locale.svelte';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Player from '$lib/components/Radio/Player.svelte';
  import MarkdownText from '$lib/ui/MarkdownText/MarkdownText.svelte';

  import tireTrack480 from '$lib/assets/images/tire_track/tire_tracks_w480.avif';
  import tireTrack960 from '$lib/assets/images/tire_track/tire_tracks_w960.avif';
  import tireTrack1440 from '$lib/assets/images/tire_track/tire_tracks_w1440.avif';
  import tireTrack1920 from '$lib/assets/images/tire_track/tire_tracks_w1920.avif';
  import tireTrack2880 from '$lib/assets/images/tire_track/tire_tracks_w2880.avif';
  import tireTrack3840 from '$lib/assets/images/tire_track/tire_tracks_w3840.avif';
  import tireTrackP180 from '$lib/assets/images/tire_track/tire_tracks_p_w180.avif';
  import tireTrackP360 from '$lib/assets/images/tire_track/tire_tracks_p_w360.avif';
  import tireTrackP720 from '$lib/assets/images/tire_track/tire_tracks_p_w720.avif';
  import tireTrackP1080 from '$lib/assets/images/tire_track/tire_tracks_p_w1080.avif';
  import tireTrackP1440 from '$lib/assets/images/tire_track/tire_tracks_p_w1440.avif';
</script>

<svelte:head>
  <title
    >{siteLocale.msg['radio.head']({
      siteName: siteLocale.msg['site_name_short'](),
    })}</title
  >
</svelte:head>

<div class="bg-cover bg-fixed bg-center">
  <picture class="-z-1 pointer-events-none fixed inset-0 h-full w-full">
    <source
      media="(orientation: portrait)"
      srcset={`${tireTrackP180} 180w, ${tireTrackP360} 360w, ${tireTrackP720} 720w, ${tireTrackP1080} 1080w, ${tireTrackP1440} 1440w`}
      sizes="100vw"
    />
    <source
      media="(orientation: landscape)"
      srcset={`${tireTrack480} 480w, ${tireTrack960} 960w, ${tireTrack1440} 1440w, ${tireTrack1920} 1920w, ${tireTrack2880} 2880w, ${tireTrack3840} 3840w`}
      sizes="100vw"
    />
    <img src={tireTrack1920} alt="" class="h-full w-full object-cover" />
  </picture>

  <CommonHead class="text-text-dark justify-center bg-black/70 dark:bg-black/90"
    >{siteLocale.msg['radio.title']()}</CommonHead
  >

  <div class="relative min-h-screen overflow-hidden pb-8">
    <div class="pointer-events-none absolute inset-0 bg-black/70 dark:bg-black/90"></div>

    <div class="relative z-10 mx-auto w-full px-3">
      <Player stationName={siteLocale.msg['radio.station_name']()}></Player>
    </div>
    <div class="px-3">
      <Card
        class="bg-background-300 dark:bg-background-900/80 max-w-175 relative mx-auto mt-8 rounded-lg border border-gray-300 p-6 backdrop-blur-sm dark:border-gray-700"
      >
        <div class="-mb-[1.25em]">
          <MarkdownText text={siteLocale.msg['radio_guide.content_markdown']()} noSanitize />
        </div>
      </Card>
    </div>
  </div>
</div>
