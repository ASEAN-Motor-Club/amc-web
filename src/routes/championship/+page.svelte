<script lang="ts">
  import poster455 from '$lib/assets/images/poster/asean_poster_w455.avif';
  import poster909 from '$lib/assets/images/poster/asean_poster_w909.avif';
  import poster1364 from '$lib/assets/images/poster/asean_poster_w1364.avif';
  import poster1818 from '$lib/assets/images/poster/asean_poster_w1818.avif';
  import poster2727 from '$lib/assets/images/poster/asean_poster_w2727.avif';
  import poster3636 from '$lib/assets/images/poster/asean_poster_w3636.avif';
  import { m as msg } from '$lib/paraglide/messages';
  import { onMount, onDestroy, tick, getAbortSignal, settled } from 'svelte';
  import { gsap } from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  import { getTeams } from '$lib/api/teams';
  import type { Team } from '$lib/api/types';
  import { format } from '$lib/date';
  import { page } from '$app/state';
  import { replaceState } from '$app/navigation';
  import { PUBLIC_SEASON_NO, PUBLIC_SEASON_START_DATE } from '$env/static/public';
  import Button from '$lib/ui/Button/Button.svelte';

  const startDate = new Date(PUBLIC_SEASON_START_DATE);

  let headerTrigger: HTMLDivElement;
  let imageContainer: HTMLDivElement;
  let textContainer: HTMLDivElement;

  let teamTriggers: HTMLDivElement[] = $state([]);
  let teamText: HTMLDivElement[] = $state([]);

  let scrollContext: gsap.MatchMedia | undefined;

  let teams = $state<Team[]>([]);

  let loading = $state(true);

  onMount(async () => {
    gsap.registerPlugin(ScrollTrigger);

    teams = await getTeams(getAbortSignal());
    loading = false;
    await tick();

    scrollContext = gsap.matchMedia();

    scrollContext.add(
      {
        default: '(prefers-reduced-motion: no-preference)',
        reduced: '(prefers-reduced-motion: reduce)',
      },
      (context) => {
        const { reduced } = context.conditions as { reduced: boolean };
        gsap
          .timeline({
            scrollTrigger: {
              trigger: headerTrigger,
              start: 'top top',
              end: '+=1000',
              scrub: true,
              pin: true,
              pinSpacing: true,
              anticipatePin: 1,
            },
          })
          .to(
            imageContainer,
            {
              scale: reduced ? 1 : 0,
              opacity: reduced ? 0 : 1,
              ease: 'power2.out',
              duration: 0.5,
            },
            0,
          )
          .to(
            textContainer.children,
            {
              y: reduced ? 0 : 50,
              opacity: 0,
              stagger: 0.1,
              ease: 'power2.out',
              duration: 0.5,
            },
            0.5,
          );

        for (let i = 0; i < teamTriggers.length; i++) {
          const trigger = teamTriggers[i];
          gsap
            .timeline({
              scrollTrigger: {
                trigger: trigger,
                start: 'top top',
                end: '+=1500',
                pin: true,
                pinSpacing: true,
                anticipatePin: 1,
                scrub: true,
                onToggle: (self) => {
                  const teamTag = teams[i]?.tag;
                  if (teamTag) {
                    const expectedHash = `#team-${teamTag}`;
                    if (self.isActive) {
                      replaceState(expectedHash, page.state);
                    } else {
                      replaceState('', page.state);
                    }
                  }
                },
              },
            })
            .from(
              trigger.children,
              {
                x: reduced ? 0 : 50,
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
                x: reduced ? 0 : -50,
                opacity: 0,
                stagger: 0.1,
                ease: 'power2.out',
                duration: 0.5,
              },
              0.5,
            )
            .to({}, { duration: 3 });
        }
      },
    );

    const initialHash = page.url.hash;

    await settled();

    if (initialHash.startsWith('#team-')) {
      const teamTag = decodeURIComponent(initialHash.replace('#team-', ''));
      const teamIndex = teams.findIndex((team) => team.tag === teamTag);
      if (teamIndex !== -1 && teamTriggers[teamIndex]) {
        const rect = teamTriggers[teamIndex].getBoundingClientRect();
        window.scrollTo({
          top: window.scrollY + rect.top + 1500 / 3,
          behavior: 'instant',
        });
      }
    }
  });

  const onTeamClick = () => {
    if (teamTriggers[0]) {
      const rect = teamTriggers[0].getBoundingClientRect();
      window.scrollTo({
        top: window.scrollY + rect.top + 1500 / 3,
        behavior: 'smooth',
      });
    }
  };

  onDestroy(() => {
    scrollContext?.revert();
  });

  const title = $derived(
    msg['championship.head']({
      siteName: msg.site_name_short(),
      seasonNo: PUBLIC_SEASON_NO,
    }),
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="og:title" content={title} />
</svelte:head>
<div class="-mt-16 flex flex-col items-center overflow-x-hidden">
  <div
    class="flex h-svh w-full flex-col items-center justify-center p-8 pt-24 md:p-20 md:pt-36"
    bind:this={headerTrigger}
  >
    <div class="aspect-ratio-1818/1162 min-h-0 w-full max-w-250 flex-shrink-1">
      <img
        srcset={`${poster455} 455w, ${poster909} 909w, ${poster1364} 1364w, ${poster1818} 1818w, ${poster2727} 2727w, ${poster3636} 3636w`}
        alt="ASEAN Poster"
        class="aspect-ratio-1818/1162 h-full w-full object-contain"
        fetchpriority="high"
        bind:this={imageContainer}
      />
    </div>
    <div class="contents" bind:this={textContainer}>
      <h3 class="pt-8 pb-5 font-semibold">
        {msg['championship.starting_from']({
          date: format(startDate, msg['format.dateFull']()),
        })}
      </h3>
      <h1 class="font-sans-alt pb-8 text-center text-4xl font-bold sm:text-7xl">
        {msg['championship.title']()}
      </h1>
      <h2 class="font-sans-alt pb-8 text-2xl font-semibold sm:text-3xl">
        {msg['championship.season']({ seasonNo: PUBLIC_SEASON_NO })}
      </h2>
      <div class="flex gap-3">
        <Button class="w-36" variant="contained" tag="a" href="/championship/details">
          {msg['championship.event_details']()}
        </Button>
        <Button class="w-36" variant="contained" onClick={onTeamClick}>
          {msg['championship.our_teams']()}
        </Button>
      </div>
    </div>
  </div>
  {#if !loading}
    <div class="flex w-full flex-col">
      {#each teams as team, i (team.id)}
        <div
          class="h-lvh bg-[var(--team-bg)] text-[var(--team-text)]"
          style="--team-bg:{team.bg_color};--team-text:{team.text_color}"
          bind:this={teamTriggers[i]}
        >
          <div
            class="flex h-dvh w-full flex-col items-center justify-evenly p-8 pt-24 md:p-20 md:pt-36"
          >
            {#if team.logo}
              <div class="min-h-0 w-full max-w-40 md:max-w-80">
                <img
                  src={team.logo}
                  alt={msg['championship.team_logo_alt']({
                    team: team.name,
                  })}
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
  {/if}
</div>
