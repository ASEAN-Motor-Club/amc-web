<script lang="ts">
  import poster from '$lib/assets/asean_poster.avif';
  import { m } from '$lib/paraglide/messages';
</script>

<div class="flex w-full flex-col items-center">
  <div class="-mt-14 flex h-dvh flex-col items-center justify-center pt-14 lg:-mt-16 lg:pt-16">
    <img
      src={poster}
      alt="ASEAN Poster"
      class="mx-20 mb-20 w-full max-w-250"
      fetchpriority="high"
    />
    <h1 class="text-center text-6xl font-bold">{m['site_name']()}</h1>
  </div>
</div>
