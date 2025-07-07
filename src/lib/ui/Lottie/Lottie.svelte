<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import lottie from 'lottie-web/build/player/lottie_light';
  import { onMount } from 'svelte';
  type LottieProps = {
    animationData: unknown;
    autoplay?: boolean;
    loop?: boolean;
    class?: ClassValue;
    speed?: number;
  };

  const { animationData, autoplay, loop, class: className, speed }: LottieProps = $props();

  let container: HTMLDivElement;

  onMount(() => {
    const animation = lottie.loadAnimation({
      container,
      renderer: 'svg',
      loop,
      autoplay,
      animationData,
    });

    if (speed) {
      animation.setSpeed(speed);
    }

    return () => {
      animation.destroy();
    };
  });
</script>

<div class={className} bind:this={container}></div>
