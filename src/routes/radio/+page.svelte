<script>
  import CommonHead from '$lib/components/CommonHead/CommonHead.svelte';
  import NotFinished from '$lib/components/NotFinished/NotFinished.svelte';
  import { m } from '$lib/paraglide/messages';
</script>

<CommonHead>{m['radio.title']()}</CommonHead>
<NotFinished />
