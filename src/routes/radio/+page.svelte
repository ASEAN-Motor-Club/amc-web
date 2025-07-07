<script lang="ts">
  import { m } from '$lib/paraglide/messages';
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import Card from '$lib/ui/Card/Card.svelte';
  import Player from '$lib/components/Radio/Player.svelte';
  import tireTrack from '$lib/assets/images/tire_tracks.avif';
  import { writable } from 'svelte/store';

  const nowPlaying = writable<string | null>('Turbo Groove');
</script>

{#snippet playing()}
  <span>{$nowPlaying}</span>
{/snippet}

<CommonHead>{m['radio.title']()}</CommonHead>

<div class="bg-white-100 relative min-h-screen overflow-hidden py-8 dark:bg-gray-900">
  <img
    src={tireTrack}
    alt="Tire background"
    class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-100 dark:opacity-70"
  />
  <div class="pointer-events-none absolute inset-0 bg-black/90 dark:bg-black/70"></div>

  <div class="relative z-10 mx-auto w-full px-3">
    <Player streamUrl="/stream" stationName="ASEAN Motor Club Radio" {playing}></Player>
  </div>

  <Card
    class="bg-background-300 dark:bg-background-900/80 relative mx-auto mt-8 max-w-[700px] rounded-lg border border-gray-300 p-6 text-gray-800 backdrop-blur-sm dark:border-gray-700 dark:text-gray-200"
  >
    <h2 class="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Radio Features</h2>
    <ul class="mb-4 list-inside list-disc space-y-2">
      <li>Song requests (use <code class="code-snippet">/song_request</code> in Discord)</li>
      <li>News segments</li>
      <li>Game guides, e.g. Tuning, making money, etc.</li>
    </ul>

    <h3 class="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
      2 ways you can tune in!
    </h3>
    <ul class="list-inside list-disc space-y-2">
      <li>Use the mod to add Radio ASEAN to your game! See below for installation guide.</li>
      <li>
        Visit our web stream:
        <a
          href="https://www.aseanmotorclub.com/stream"
          target="_blank"
          rel="noopener noreferrer"
          class="dark:text-blue-400; text-blue-600 hover:underline"
          >https://www.aseanmotorclub.com/stream</a
        >
      </li>
    </ul>

    <hr class="my-6 border-gray-300 dark:border-gray-600" />

    <h2 class="mb-4 text-2xl font-bold text-gray-900 dark:text-white">Mod Installation</h2>
    <p class="mb-4">
      Download the mod here:
      <a
        href="https://www.aseanmotorclub.com/static/RadioMod_P.pak"
        class="dark:text-blue-400; font-semibold text-blue-600 hover:underline"
        download>Download RadioMod_P.pak</a
      >
    </p>

    <p class="mb-2 font-medium">
      Place the <code
        class="bg-background-400 dark:bg-background-700 rounded px-1.5 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
        >RadioMod_P.pak</code
      > file into:
    </p>
    <pre
      class="bg-background-400 dark:bg-background-800 mb-4 w-full overflow-x-auto rounded-md p-3 text-sm"><code
        class="text-black dark:text-white">steamapps\common\Motor Town\MotorTown\Content\Paks\</code
      ></pre>
    <p class="mb-2 font-medium">next to MotorTown-Windows.pak You need to RESTART the game.</p>

    <h3 class="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
      How to find your game folder:
    </h3>
    <ol class="list-inside list-decimal space-y-2 pt-2">
      <li>Open Steam &gt; <strong>Library</strong></li>
      <li>
        Right click on your game &gt; <strong>Manage</strong> &gt;
        <strong>Browse Local Files</strong>
      </li>
      <li>
        Navigate to <code
          class="bg-background-400 dark:bg-background-700 rounded px-1.5 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
          >MotorTown > Content > Paks
        </code>
      </li>
      <li>
        Place the <code
          class="bg-background-400 dark:bg-background-700 rounded px-1.5 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
          >RadioMod_P.pak
        </code>
        file next to
        <code
          class="bg-background-400 dark:bg-background-700 rounded px-1.5 py-1 font-mono text-sm text-gray-800 dark:text-gray-200"
          >MotorTown-Windows.pak
        </code>
      </li>
      <li><strong>Restart the game</strong> for the mod to take effect.</li>
    </ol>
  </Card>
</div>
