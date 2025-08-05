<script lang="ts">
  import { m as msg } from '$lib/paraglide/messages';

  type Props = {
    class?: string;
  };

  const { class: className }: Props = $props();
</script>

<div class={['flex h-[calc(100dvh_-_12rem)] flex-col items-center justify-center', className]}>
  <div
    class="i-material-symbols:car-crash-outline-rounded text-9xl tracking-tight text-neutral-500/50"
  ></div>

  <h1 class="mt-4 px-2 text-center text-xl font-semibold">{msg.not_finished()}</h1>
</div>
