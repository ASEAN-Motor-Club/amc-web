<script lang="ts">
  import type { DeliveryJob } from '$lib/api/types';
  import type { ClassValue } from 'svelte/elements';
  import { DetailsFeatures, getLinkHref } from '../utils';

  export interface DeliveryLinkProps {
    fullScreen: boolean;
    job: DeliveryJob;
    showId?: boolean;
    idOnly?: boolean;
    class?: ClassValue;
  }

  const { fullScreen, job, showId, idOnly, class: className }: DeliveryLinkProps = $props();
</script>

<a
  href={getLinkHref(fullScreen, DetailsFeatures.Jobs, job.id)}
  class={[
    'text-orange-600 hover:text-orange-500 dark:text-orange-500 dark:hover:text-orange-400',
    className,
  ]}
  >{#if idOnly}{job.id}{:else}{showId ? `${job.id}. ` : ''}{job.name}{/if}</a
>
