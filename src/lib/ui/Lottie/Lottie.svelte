<script lang="ts">
  import type { ClassValue } from 'svelte/elements';
  import lottie, { type AnimationItem } from 'lottie-web/build/player/lottie_light';
  import { onMount } from 'svelte';
  interface LottieProps {
    animationData: unknown;
    autoplay?: boolean;
    loop?: boolean | number;
    class?: ClassValue;
    speed?: number;
  }

  const { animationData, autoplay, loop, class: className, speed }: LottieProps = $props();

  let lottieEl: HTMLDivElement;

  let animation: AnimationItem;

  onMount(() => {
    // @unocss-skip-start
    animation = lottie.loadAnimation({
      container: lottieEl,
      renderer: 'svg',
      loop,
      autoplay,
      animationData,
    });
    // @unocss-skip-end

    return () => {
      animation.destroy();
    };
  });

  $effect(() => {
    if (speed) {
      animation.setSpeed(speed);
    }
  });

  $effect(() => {
    if (typeof loop === 'boolean') {
      animation.setLoop(loop);
    }
  });
</script>

<div class={className} bind:this={lottieEl}></div>
