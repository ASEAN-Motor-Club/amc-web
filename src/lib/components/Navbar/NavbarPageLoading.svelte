<script lang="ts">
  import { navigating } from '$app/state';
  import { fade } from 'svelte/transition';
  import { defaultTransitionDurationMs } from '$lib/tw-var';

  let show = $state(false);
  let speedUp = $state(false);
  let widthFull = $state(false);

  let showDelayId: number;
  let prevTo: string | undefined;

  $effect(() => {
    if (navigating.to) {
      if (prevTo !== navigating.to?.url.pathname) {
        speedUp = true;
        widthFull = false;
        clearTimeout(showDelayId);
        showDelayId = setTimeout(() => {
          prevTo = navigating.to?.url.pathname;
          speedUp = false;
          show = true;
          setTimeout(() => {
            widthFull = true;
          });
        }, defaultTransitionDurationMs * 2);
      }
    } else {
      speedUp = true;
      clearTimeout(showDelayId);
      showDelayId = setTimeout(() => {
        show = false;
      }, defaultTransitionDurationMs * 4);
    }

    return () => {
      clearTimeout(showDelayId);
    };
  });
</script>

{#if show}
  <div
    class="z-100000 pointer-events-none fixed top-16 flex w-full select-none"
    transition:fade={{
      duration: defaultTransitionDurationMs,
    }}
  >
    <div
      class={[
        'bg-primary-500 fixed top-16 flex h-2 transition-all ease-[cubic-bezier(0.16,1,0.3,1)]',
        { 'transition-duration-30s w-90%': widthFull && !speedUp },
        { 'transition-duration-300 w-full': widthFull && speedUp },
        { 'transition-duration-300 w-0': !widthFull },
      ]}
    ></div>
  </div>
{/if}
