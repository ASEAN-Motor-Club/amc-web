import { SvelteDate } from 'svelte/reactivity';

export const createSvelteDate = () => {
  const svelteDate = new SvelteDate();

  $effect(() => {
    let animationId: number;

    const updateTime = () => {
      svelteDate.setTime(Date.now());
      animationId = requestAnimationFrame(updateTime);
    };

    animationId = requestAnimationFrame(updateTime);

    return () => {
      cancelAnimationFrame(animationId);
    };
  });

  return svelteDate;
};
