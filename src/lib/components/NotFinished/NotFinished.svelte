<script lang="ts">
  import { m } from '$messages';

  interface Props {
    class?: string;
  }

  const { class: propsClass }: Props = $props();
</script>

<div class={['flex h-[calc(100dvh_-_12rem)] flex-col items-center justify-center', propsClass]}>
  <div
    class="i-material-symbols:car-crash-outline-rounded text-500 dark:text-500 text-9xl tracking-tight"
  ></div>

  <h1 class="mt-4 px-2 text-center text-xl font-semibold">{m.not_finished()}</h1>
</div>
