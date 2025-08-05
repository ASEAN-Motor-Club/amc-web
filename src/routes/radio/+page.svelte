<script lang="ts">
  import { m as msg } from '$lib/paraglide/messages';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Player from '$lib/components/Radio/Player.svelte';

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
  <title>{msg['radio.head']({ siteName: msg['site_name_short']() })}</title>
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
    >{msg['radio.title']()}</CommonHead
  >

  <div class="relative min-h-screen overflow-hidden pb-8">
    <div class="pointer-events-none absolute inset-0 bg-black/70 dark:bg-black/90"></div>

    <div class="relative z-10 mx-auto w-full px-3">
      <Player stationName={msg['radio.station_name']()}></Player>
    </div>
    <div class="px-3">
      <Card
        class="bg-background-300 dark:bg-background-900/80 max-w-175 relative mx-auto mt-8 rounded-lg border border-gray-300 p-6 backdrop-blur-sm dark:border-gray-700"
      >
        <h2 class="dark:text-text-dark mb-4 text-2xl font-bold text-gray-900">
          {msg['radio_guide.features_title']()}
        </h2>
        <ul class="mb-4 list-inside list-disc space-y-2">
          <li>
            {msg['radio_guide.song_requests']()} <code>/song_request</code>
            {msg['radio_guide.in_discord']()}
          </li>
          <li>{msg['radio_guide.news_segments']()}</li>
          <li>{msg['radio_guide.game_guides']()}</li>
        </ul>

        <h3 class="dark:text-text-dark mb-3 text-lg font-semibold text-gray-900">
          {msg['radio_guide.tune_in_title']()}
        </h3>
        <ul class="list-inside list-disc space-y-2">
          <li>{msg['radio_guide.mod_method']()}</li>
          <li>
            {msg['radio_guide.web_stream']()}
            <a
              href="https://www.aseanmotorclub.com/stream"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:underline dark:text-blue-400"
              >https://www.aseanmotorclub.com/stream</a
            >
          </li>
        </ul>

        <hr class="my-6 border-gray-300 dark:border-gray-600" />

        <h2 class="dark:text-text-dark mb-4 text-2xl font-bold text-gray-900">
          {msg['radio_guide.mod_title']()}
        </h2>
        <p class="mb-4">
          {msg['radio_guide.download_mod']()}
          <a
            href="https://www.aseanmotorclub.com/static/RadioMod_P.pak"
            class="font-semibold text-blue-600 hover:underline dark:text-blue-400"
            download>{msg['radio_guide.download_link']()}</a
          >
        </p>

        <p class="mb-2 font-medium">
          {msg['radio_guide.place_file']()}
          <code
            class="bg-background-400 dark:bg-background-700 rounded px-1.5 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
            >RadioMod_P.pak</code
          >
          {msg['radio_guide.file_into']()}
        </p>
        <pre
          class="bg-background-400 dark:bg-background-800 mb-4 w-full overflow-x-auto rounded-md p-3 text-sm"><code
            class="dark:text-text-dark text-text"
            >steamapps\common\Motor Town\MotorTown\Content\Paks\</code
          ></pre>
        <p class="mb-2 font-medium">
          {msg['radio_guide.next_to']()}
          {msg['radio_guide.restart_game']()}
        </p>

        <h3 class="dark:text-text-dark mt-4 text-lg font-semibold text-gray-900">
          {msg['radio_guide.find_folder_title']()}
        </h3>
        <ol class="list-inside list-decimal space-y-2 pt-2">
          <li>{msg['radio_guide.step1']()}</li>
          <li>
            {msg['radio_guide.step2']()}
          </li>
          <li>
            {msg['radio_guide.step3']()}
            <code
              class="bg-background-400 dark:bg-background-700 rounded px-1.5 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
              >MotorTown > Content > Paks
            </code>
          </li>
          <li>
            {msg['radio_guide.step4']()}
            <code
              class="bg-background-400 dark:bg-background-700 rounded px-1.5 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
              >RadioMod_P.pak
            </code>
            {msg['radio_guide.step4b']()}
            <code
              class="bg-background-400 dark:bg-background-700 rounded px-1.5 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
              >MotorTown-Windows.pak
            </code>
          </li>
          <li><strong>{msg['radio_guide.step5']()}</strong></li>
        </ol>
      </Card>
    </div>
  </div>
</div>
