<script lang="ts">
  import poster455 from '$lib/assets/images/poster/asean_poster_w455.avif';
  import poster909 from '$lib/assets/images/poster/asean_poster_w909.avif';
  import poster1364 from '$lib/assets/images/poster/asean_poster_w1364.avif';
  import poster1818 from '$lib/assets/images/poster/asean_poster_w1818.avif';
  import poster2727 from '$lib/assets/images/poster/asean_poster_w2727.avif';
  import poster3636 from '$lib/assets/images/poster/asean_poster_w3636.avif';
  import Standing from '$lib/components/Championship/Standing.svelte';
  import { m } from '$lib/paraglide/messages';
  import { onMount } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import { teamsRaceOnly } from '$lib/data/teams';
  import CalendarGroup from '$lib/components/Championship/CalendarGroup.svelte';

  const seasonNo = 2;

  let hintTrigger: HTMLDivElement;
  let hintContainer: HTMLDivElement;
  let headerTrigger: HTMLDivElement;
  let imageContainer: HTMLDivElement;
  let textContainer: HTMLDivElement;
  let teamTitleTriggers: HTMLDivElement;
  let teamTriggers: HTMLDivElement[] = [];
  let teamText: HTMLDivElement[] = [];
  let standingTriggers: HTMLDivElement;

  onMount(() => {
    gsap.registerPlugin(ScrollTrigger);

    const tlHint = gsap
      .timeline({
        scrollTrigger: {
          trigger: hintTrigger,
          start: 'top top',
          end: '+=100',
          scrub: true,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
        },
      })
      .to(
        hintContainer,
        {
          scale: 0,
          ease: 'power2.out',
        },
        0,
      );

    const tlHead = gsap
      .timeline({
        scrollTrigger: {
          trigger: headerTrigger,
          start: 'top top',
          end: '+=2000',
          scrub: true,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
        },
      })
      .from(
        imageContainer,
        {
          scale: 0,
          ease: 'power2.out',
          duration: 0.5,
        },
        0,
      )
      .from(
        textContainer.children,
        {
          y: 50,
          opacity: 0,
          stagger: 0.1,
          ease: 'power2.out',
          duration: 0.5,
        },
        0.5,
      )
      .to({}, { duration: 2 });

    const tlTeamTitle = gsap.timeline({
      scrollTrigger: {
        trigger: teamTitleTriggers,
        start: 'top top',
        end: '+=100%',
        scrub: true,
        pin: true,
        anticipatePin: 1,
      },
    });

    const tlTeams = teamTriggers.map((trigger, i) =>
      gsap
        .timeline({
          scrollTrigger: {
            trigger: trigger,
            start: 'top top',
            end: '+=2000',
            pin: true,
            pinSpacing: true,
            anticipatePin: 1,
            scrub: true,
          },
        })
        .from(
          trigger.children,
          {
            x: 50,
            opacity: 0,
            stagger: 0.1,
            ease: 'power2.out',
            duration: 0.5,
          },
          0,
        )
        .from(
          teamText[i].children,
          {
            x: -50,
            opacity: 0,
            stagger: 0.1,
            ease: 'power2.out',
            duration: 0.5,
          },
          0.5,
        )
        .to({}, { duration: 3 }),
    );

    const tlStanding = gsap
      .timeline({
        scrollTrigger: {
          trigger: standingTriggers,
          start: 'top top',
          end: '+=2000',
          scrub: true,
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
        },
      })
      .from(
        standingTriggers.children[1].children[0],
        {
          x: -100,
          opacity: 0,
          ease: 'power2.out',
          duration: 1,
        },
        0,
      )
      .from(
        standingTriggers.children[1].children[1],
        {
          x: 100,
          opacity: 0,
          ease: 'power2.out',
          duration: 1,
        },
        0,
      )
      .to({}, { duration: 3 });

    return () => {
      tlHint.kill();
      tlHead.kill();
      tlTeamTitle.kill();
      tlTeams.forEach((tlTeam) => tlTeam.kill());
      tlStanding.kill();
    };
  });
</script>

<svelte:head>
  <title>{m['championship.head']({ siteName: m['site_name_short'](), seasonNo })}</title>
</svelte:head>

<div class="-mt-16 flex flex-col items-center overflow-x-hidden">
  <div class="flex h-svh w-full items-center justify-center p-8 pt-24" bind:this={hintTrigger}>
    <div bind:this={hintContainer} class="text-text/80 dark:text-text-dark/80 text-sm">
      {m['championship.scroll_hint']()}
    </div>
  </div>
  <div
    class="flex h-svh w-full flex-col items-center justify-center p-8 pt-24"
    bind:this={headerTrigger}
  >
    <div class="max-w-250 flex-shrink-1 aspect-ratio-1818/1162 min-h-0 w-full">
      <img
        srcset={`${poster455} 455w, ${poster909} 909w, ${poster1364} 1364w, ${poster1818} 1818w, ${poster2727} 2727w, ${poster3636} 3636w`}
        alt="ASEAN Poster"
        class="aspect-ratio-1818/1162 h-full w-full object-contain"
        fetchpriority="high"
        bind:this={imageContainer}
      />
    </div>
    <div class="contents" bind:this={textContainer}>
      <h3 class="pb-5 pt-8 font-semibold">{m['championship.coming_soon']()}</h3>
      <h1 class="font-sans-alt pb-8 text-center text-4xl font-bold sm:text-7xl">
        {m['championship.title']()}
      </h1>
      <h2 class="font-sans-alt text-2xl font-semibold sm:text-3xl">
        {m['championship.season']({ seasonNo })}
      </h2>
    </div>
  </div>
  <div class="h-svh w-full pb-8 pt-24" bind:this={teamTitleTriggers}>
    <h4 class="pt-18 pb-8 text-center text-4xl font-semibold tracking-tight">
      {m['championship.teams']()}
    </h4>
  </div>
  <div class="flex w-full flex-col">
    {#each teamsRaceOnly as team, i (team.tag)}
      <div
        class="h-lvh !bg-[var(--team-bg)] text-[var(--team-text)]"
        style="--team-bg:{team.bg};--team-text:{team.text}"
        bind:this={teamTriggers[i]}
      >
        <div
          class={[
            'flex h-dvh w-full flex-col items-center p-8 pt-24',
            team.logo ? 'justify-between' : 'justify-center',
          ]}
        >
          {#if team.logo}
            <img
              src={team.logo}
              alt="Team Logo"
              class={[
                'aspect-1 md:w-100 lg:w-125 my-4 w-40 overflow-hidden rounded-2xl bg-neutral-500/10 object-contain sm:my-8',
                team.logo ? '' : 'invisible',
              ]}
              fetchpriority="high"
            />
          {/if}
          <div bind:this={teamText[i]}>
            <h4
              class="my-4 text-center text-4xl font-semibold tracking-tight text-[var(--team-text)] sm:my-8"
            >
              [{team.tag}] {team.name}
            </h4>
            <p class=" text-center text-sm text-[var(--team-text)] sm:my-8">
              {team.description}
            </p>
            <p class="my-4 text-center text-sm text-[var(--team-text)] sm:my-8">
              Members: {team.members.join(', ')}
            </p>
          </div>
        </div>
      </div>
    {/each}
  </div>
  <div
    class="flex h-svh w-full flex-col items-center justify-center p-8 pt-24"
    bind:this={standingTriggers}
  >
    <Standing />
  </div>
  <div class="flex h-svh w-full flex-col items-center justify-center p-8 pt-24">
    <CalendarGroup />
  </div>
</div>
