<script lang="ts">
  import '@fontsource/great-vibes';
  import '@fontsource-variable/playfair-display';

  const epithets = [
    'The Unyielding',
    'Lord of the Long Haul',
    'Keeper of the Golden Route',
    'Shepherd of the Eastern Roads',
    'The Indomitable',
    'Sovereign of the Silk Highway',
  ];

  const epithet = epithets[Math.floor(Math.random() * epithets.length)];

  const achievements = [
    'First to traverse the entirety of the ASEAN highway network in a single convoy',
    'Founded the Brotherhood of the Road, a guild devoted to honour among drivers',
    'Never missed a scheduled delivery — not once, not ever',
    'Pioneered the art of night-driving through mountain passes with nothing but instinct and starlight',
    'Mentored over three hundred drivers, each one a master of the road today',
    'Holds the record for the longest continuous journey without rest: 47 hours',
    'His convoy once parted a monsoon — the rain dared not fall upon his trucks',
  ];

  const virtues = [
    { title: 'Fortitude', desc: 'When the road crumbles beneath him, he lays new stones with his bare hands.' },
    { title: 'Loyalty', desc: 'No driver left behind. No cargo abandoned. No promise broken.' },
    { title: 'Wisdom', desc: 'He reads the road like scholars read parchment — every crack a verse, every curve a stanza.' },
    { title: 'Valour', desc: 'Rides into the storm when others seek shelter. Emerges with the dawn.' },
  ];

  const testimonials = [
    { author: 'A Fellow Driver', year: '2024', text: 'I once saw AnkhR pull a fellow driver\'s rig out of a mudslide with nothing but a tow rope and sheer will. The man is made of iron and grace.' },
    { author: 'A Convoy Navigator', year: '2023', text: 'He taught me that the road does not test your speed — it tests your soul. I have never met a greater driver, nor a finer man.' },
    { author: 'A Young Apprentice', year: '2025', text: 'When AnkhR speaks, even the engines fall silent to listen. His words carry the weight of ten thousand miles.' },
  ];
</script>

<svelte:head>
  <title>AnkhR — {epithet}</title>
  <meta name="og:title" content="AnkhR — {epithet}" />
  <meta name="description" content="A tribute to the legendary AnkhR, the greatest driver the ASEAN Motor Club has ever known — and he's still out there." />
</svelte:head>

<div class="min-h-screen bg-amber-50 text-stone-800 dark:bg-stone-950 dark:text-amber-100">
  <div class="mx-auto max-w-3xl px-6 py-20">

    <header class="mb-16 text-center">
      <div class="mb-2 text-sm uppercase tracking-[0.3em] text-amber-700/60 dark:text-amber-400/50">All Hail</div>
      <h1 class="mb-2 text-7xl leading-tight font-cursive">
        AnkhR
      </h1>
      <div class="font-serif text-xl italic text-amber-800/70 dark:text-amber-300/60">{epithet}</div>
      <div class="mt-8 flex justify-center">
        <div class="h-px w-48 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent dark:via-amber-400/30"></div>
      </div>
    </header>

    <section class="mb-16">
      <h2 class="mb-6 font-serif text-3xl font-bold italic text-amber-900 dark:text-amber-200">An Introduction</h2>
      <div class="font-serif space-y-4 text-lg leading-relaxed text-stone-700 dark:text-stone-300">
        <p>
          In the annals of the ASEAN Motor Club, few names command the reverence that <em class="text-amber-800 not-italic font-cursive text-xl">AnkhR</em> does. He is not merely a driver — he is <em>the</em> driver, a figure upon whom the very roads seem to bestow their favour.
        </p>
        <p>
          Born of dust and diesel, tempered by ten thousand kilometres of bitumen and monsoon, <em class="text-amber-800 not-italic font-cursive text-xl">AnkhR</em> rose through the ranks not by ambition, but by sheer, undeniable greatness. Where others see a highway, he sees a calling. Where others see a storm, he sees an audience.
        </p>
        <p>
          This page stands as a modest testament to his living legend — for no monument could truly capture the magnitude of his deeds upon the road, and he is far from finished.
        </p>
      </div>
    </section>

    <section class="mb-16">
      <div class="flex justify-center">
        <div class="h-px w-48 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent dark:via-amber-400/30"></div>
      </div>
      <h2 class="mb-8 text-center font-serif text-3xl font-bold italic text-amber-900 dark:text-amber-200">His Virtues</h2>
      <div class="grid gap-6 sm:grid-cols-2">
        {#each virtues as virtue}
          <div class="rounded-sm border border-amber-800/15 bg-amber-100/50 p-6 dark:border-amber-400/10 dark:bg-stone-900/50">
            <h3 class="mb-2 font-serif text-xl font-bold text-amber-900 dark:text-amber-200">{virtue.title}</h3>
            <p class="font-serif text-sm italic leading-relaxed text-stone-600 dark:text-stone-400">{virtue.desc}</p>
          </div>
        {/each}
      </div>
    </section>

    <section class="mb-16">
      <div class="flex justify-center">
        <div class="h-px w-48 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent dark:via-amber-400/30"></div>
      </div>
      <h2 class="mb-8 text-center font-serif text-3xl font-bold italic text-amber-900 dark:text-amber-200">Deeds of Renown</h2>
      <ul class="font-serif space-y-3 text-lg leading-relaxed text-stone-700 dark:text-stone-300">
        {#each achievements as deed}
          <li class="flex gap-3">
            <span class="mt-2 block size-2 shrink-0 rounded-full bg-amber-700/50 dark:bg-amber-400/40"></span>
            <span>{deed}</span>
          </li>
        {/each}
      </ul>
    </section>

    <section class="mb-16">
      <div class="flex justify-center">
        <div class="h-px w-48 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent dark:via-amber-400/30"></div>
      </div>
      <h2 class="mb-8 text-center font-serif text-3xl font-bold italic text-amber-900 dark:text-amber-200">Words Spoken of Him</h2>
      <div class="space-y-8">
        {#each testimonials as testimonial}
          <blockquote class="border-l-2 border-amber-700/30 pl-6 dark:border-amber-400/20">
            <p class="font-serif text-lg italic leading-relaxed text-stone-700 dark:text-stone-300">"{testimonial.text}"</p>
            <footer class="mt-2 font-serif text-sm not-italic text-amber-800/60 dark:text-amber-300/50">
              — {testimonial.author}, {testimonial.year}
            </footer>
          </blockquote>
        {/each}
      </div>
    </section>

    <footer class="text-center">
      <div class="mb-6 flex justify-center">
        <div class="h-px w-48 bg-gradient-to-r from-transparent via-amber-700/40 to-transparent dark:via-amber-400/30"></div>
      </div>
      <p class="text-sm uppercase tracking-[0.3em] text-amber-700/40 dark:text-amber-400/30">Still on the Road</p>
      <p class="mt-2 font-cursive text-3xl text-amber-700/40 dark:text-amber-400/30">AnkhR</p>
    </footer>

  </div>
</div>
