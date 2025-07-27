<script lang="ts">
  import poster455 from '$lib/assets/images/poster/asean_poster_w455.avif';
  import poster909 from '$lib/assets/images/poster/asean_poster_w909.avif';
  import poster1364 from '$lib/assets/images/poster/asean_poster_w1364.avif';
  import poster1818 from '$lib/assets/images/poster/asean_poster_w1818.avif';
  import poster2727 from '$lib/assets/images/poster/asean_poster_w2727.avif';
  import poster3636 from '$lib/assets/images/poster/asean_poster_w3636.avif';
  import Standing from '$lib/components/Championship/Standing.svelte';
  import { m } from '$lib/paraglide/messages';
  import { onMount, onDestroy, tick } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import CalendarGroup from '$lib/components/Championship/CalendarGroup.svelte';
  import lottieSpark from '$lib/assets/lottie/sparkle-long.json';
  import Lottie from '$lib/ui/Lottie/Lottie.svelte';
  import ScrollHint from '$lib/components/Home/ScrollHint.svelte';
  import { getTeams } from '$lib/api/teams';
  import type { ScheduledEvent, Team } from '$lib/api/types';
  import { getEvents } from '$lib/api/championship';
  import { format } from '$lib/localeFormat/date';
  import { page } from '$app/state';
  import EventModal from '$lib/components/Championship/EventModal.svelte';
  import { goto } from '$app/navigation';

  const seasonNo = 2;
  const startDate = new Date('2025-07-26T20:00:00+07:00');

  let hintTrigger: HTMLDivElement;
  let hintContainer: HTMLDivElement;
  let headerTrigger: HTMLDivElement | undefined = $state();
  let imageContainer: HTMLDivElement | undefined = $state();
  let textContainer: HTMLDivElement | undefined = $state();
  let teamTitleTriggers: HTMLDivElement | undefined = $state();
  let teamTriggers: HTMLDivElement[] = $state([]);
  let teamText: HTMLDivElement[] = $state([]);
  let standingTriggers: HTMLDivElement | undefined = $state();
  let scheduleDiv: HTMLDivElement | undefined = $state();

  // GSAP Timeline variables
  let tlHint: gsap.core.Timeline | undefined;
  let tlHead: gsap.core.Timeline | undefined;
  let tlTeamTitle: gsap.core.Timeline | undefined;
  let tlTeams: gsap.core.Timeline[] = [];
  let tlStanding: gsap.core.Timeline | undefined;
  let abortController: AbortController = new AbortController();

  let teams = $state<Team[]>([]);
  let events = $state<ScheduledEvent[]>([]);
  let loading = $state(true);

  onMount(async () => {
    gsap.registerPlugin(ScrollTrigger);

    teams = await getTeams(abortController.signal);

    loading = false;

    await tick();

    if (
      !headerTrigger ||
      !imageContainer ||
      !textContainer ||
      !teamTitleTriggers ||
      !standingTriggers
    ) {
      return;
    }

    tlHint = gsap
      .timeline({
        scrollTrigger: {
          trigger: hintTrigger,
          start: 'top top',
          end: '+=500',
          scrub: true,
          pin: true,
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

    tlHead = gsap
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

    tlTeamTitle = gsap
      .timeline({
        scrollTrigger: {
          trigger: teamTitleTriggers,
          start: 'top top',
          end: '+=1000',
          pin: true,
          pinSpacing: true,
          anticipatePin: 1,
          scrub: true,
        },
      })
      .to(teamTitleTriggers.children, {
        scale: 0,
        ease: 'power2.out',
      });

    tlTeams = teamTriggers.map((trigger, i) =>
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

    tlStanding = gsap
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
  });

  onDestroy(() => {
    tlHint?.kill();
    tlHead?.kill();
    tlTeamTitle?.kill();
    tlTeams.forEach((tlTeam) => tlTeam?.kill());
    tlStanding?.kill();
    abortController?.abort();
  });

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

  onMount(async () => {
    events = await getEvents(abortController.signal);
    const date = page.url.searchParams.get('date');
    if (date) {
      const [year, month, day] = date.split('-');
      openedEventYear = +year;
      openedEventMonth = +month;
      openedEventDay = +day;
    }
  });
</script>

<svelte:head>
  <title>{m['championship.head']({ siteName: m['site_name_short'](), seasonNo })}</title>
</svelte:head>

{#snippet top()}
  <div class="flex h-svh w-full items-center justify-center p-8 pt-24" bind:this={hintTrigger}>
    <div bind:this={hintContainer}>
      <div class="size-90 relative flex select-none items-center justify-center">
        <div class="i-material-symbols:trophy h-full w-full text-amber-500"></div>
        <div class="absolute h-full w-full">
          <Lottie animationData={lottieSpark} loop autoplay speed={0.9} />
        </div>
      </div>
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
      <h3 class="pb-5 pt-8 font-semibold">
        {m['championship.starting_from']({
          date: format(startDate, m['config.dateFull']()),
        })}
      </h3>
      <h1 class="font-sans-alt pb-8 text-center text-4xl font-bold sm:text-7xl">
        {m['championship.title']()}
      </h1>
      <h2 class="font-sans-alt text-2xl font-semibold sm:text-3xl">
        {m['championship.season']({ seasonNo })}
      </h2>
    </div>
  </div>
{/snippet}

<div class="-mt-16 flex flex-col items-center overflow-x-hidden">
  {#if loading}
    {@render top()}
  {:else}
    <ScrollHint fixed />
    {@render top()}
    <div
      class="flex h-dvh w-full flex-col items-center justify-center p-8 pt-24"
      bind:this={teamTitleTriggers}
    >
      <h4 class="text-center text-4xl font-semibold tracking-tight">
        {m['championship.teams']()}
      </h4>
    </div>
    <div class="flex w-full flex-col">
      {#each teams as team, i (team.id)}
        <div
          class="h-lvh !bg-[var(--team-bg)] text-[var(--team-text)]"
          style="--team-bg:{team.bg_color};--team-text:{team.text_color}"
          bind:this={teamTriggers[i]}
        >
          <div class="flex h-dvh w-full flex-col items-center justify-evenly p-8 pt-24">
            {#if team.logo}
              <div class="min-h-0 w-full max-w-40 md:max-w-80">
                <img
                  src={team.logo}
                  alt={m['championship.team_logo_alt']({ team: team.name })}
                  class={[
                    'aspect-1 mx-auto h-full overflow-hidden rounded-2xl bg-neutral-500/10 object-contain',
                    team.logo ? '' : 'invisible',
                  ]}
                  fetchpriority="high"
                />
              </div>
            {/if}
            <div class="flex flex-col gap-4 sm:gap-8" bind:this={teamText[i]}>
              <h4 class="text-center text-4xl font-semibold tracking-tight text-[var(--team-text)]">
                [{team.tag}] {team.name}
              </h4>
              <p class="text-center text-sm text-[var(--team-text)]">
                {team.description}
              </p>
            </div>
          </div>
        </div>
      {/each}
    </div>
    <div
      class="flex h-svh w-full flex-col items-center justify-center px-0 py-8 pt-24 sm:py-8"
      bind:this={standingTriggers}
    >
      <Standing season={seasonNo} />
    </div>
    <div
      class="flex h-svh w-full flex-col items-center justify-center p-8 pt-24"
      bind:this={scheduleDiv}
    >
      <CalendarGroup {events} {openEvent} />
    </div>
  {/if}
</div>
<EventModal
  month={openedEventMonth}
  year={openedEventYear}
  day={openedEventDay}
  {events}
  onClose={closeEvent}
/>
