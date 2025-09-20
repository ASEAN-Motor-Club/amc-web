<script lang="ts">
  import { siteLocale } from '$lib/components/Locale/locale.svelte';

  interface Props {
    class?: string;
  }

  const { class: className }: Props = $props();
</script>

<div class={['flex h-[calc(100dvh_-_12rem)] flex-col items-center justify-center', className]}>
  <div
    class="i-material-symbols:car-crash-outline-rounded text-9xl tracking-tight text-neutral-500/50"
  ></div>

  <h1 class="mt-4 px-2 text-center text-xl font-semibold">{siteLocale.msg.not_finished()}</h1>
</div>
