<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Player from '$lib/components/Radio/Player.svelte';
  import tireTrack from '$lib/assets/images/tire_tracks.avif';
</script>

<svelte:head>
  <title>{m['radio.head']({ siteName: m['site_name_short']() })}</title>
</svelte:head>

<CommonHead>{m['radio.title']()}</CommonHead>

<div class="relative min-h-screen overflow-hidden bg-white py-8 dark:bg-gray-900">
  <img
    src={tireTrack}
    alt="Tire background"
    class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-100 dark:opacity-70"
  />
  <div class="pointer-events-none absolute inset-0 bg-black/90 dark:bg-black/70"></div>

  <div class="relative z-10 mx-auto w-full px-3">
    <Player stationName={m['radio.station_name']()}></Player>
  </div>
  <div class="px-3">
    <Card
      class="bg-background-300 dark:bg-background-900/80 max-w-175 relative mx-auto mt-8 rounded-lg border border-gray-300 p-6 text-gray-800 backdrop-blur-sm dark:border-gray-700 dark:text-gray-200"
    >
      <h2 class="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        {m['radio_guide.features_title']()}
      </h2>
      <ul class="mb-4 list-inside list-disc space-y-2">
        <li>
          {m['radio_guide.song_requests']()} <code>/song_request</code>
          {m['radio_guide.in_discord']()}
        </li>
        <li>{m['radio_guide.news_segments']()}</li>
        <li>{m['radio_guide.game_guides']()}</li>
      </ul>

      <h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
        {m['radio_guide.tune_in_title']()}
      </h3>
      <ul class="list-inside list-disc space-y-2">
        <li>{m['radio_guide.mod_method']()}</li>
        <li>
          {m['radio_guide.web_stream']()}
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

      <h2 class="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        {m['radio_guide.mod_title']()}
      </h2>
      <p class="mb-4">
        {m['radio_guide.download_mod']()}
        <a
          href="https://www.aseanmotorclub.com/static/RadioMod_P.pak"
          class="font-semibold text-blue-600 hover:underline dark:text-blue-400"
          download>{m['radio_guide.download_link']()}</a
        >
      </p>

      <p class="mb-2 font-medium">
        {m['radio_guide.place_file']()}
        <code
          class="bg-background-400 dark:bg-background-700 rounded px-1.5 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
          >RadioMod_P.pak</code
        >
        {m['radio_guide.file_into']()}
      </p>
      <pre
        class="bg-background-400 dark:bg-background-800 mb-4 w-full overflow-x-auto rounded-md p-3 text-sm"><code
          class="text-black dark:text-white"
          >steamapps\common\Motor Town\MotorTown\Content\Paks\</code
        ></pre>
      <p class="mb-2 font-medium">{m['radio_guide.next_to']()} {m['radio_guide.restart_game']()}</p>

      <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
        {m['radio_guide.find_folder_title']()}
      </h3>
      <ol class="list-inside list-decimal space-y-2 pt-2">
        <li>{m['radio_guide.step1']()}</li>
        <li>
          {m['radio_guide.step2']()}
        </li>
        <li>
          {m['radio_guide.step3']()}
          <code
            class="bg-background-400 dark:bg-background-700 rounded px-1.5 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
            >MotorTown > Content > Paks
          </code>
        </li>
        <li>
          {m['radio_guide.step4']()}
          <code
            class="bg-background-400 dark:bg-background-700 rounded px-1.5 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
            >RadioMod_P.pak
          </code>
          {m['radio_guide.step4b']()}
          <code
            class="bg-background-400 dark:bg-background-700 rounded px-1.5 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
            >MotorTown-Windows.pak
          </code>
        </li>
        <li><strong>{m['radio_guide.step5']()}</strong></li>
      </ol>
    </Card>
  </div>
</div>
