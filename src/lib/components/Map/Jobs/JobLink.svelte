<script lang="ts">
  import type { DeliveryJob } from '$lib/api/types';
  import { DetailsFeatures, getLinkHref } from '../utils';

  export interface DeliveryLinkProps {
    fullScreen: boolean;
    job: DeliveryJob;
  }

  const { fullScreen, job }: DeliveryLinkProps = $props();
</script>

<a
  href={getLinkHref(fullScreen, DetailsFeatures.Jobs, job.id)}
  class="text-orange-600 underline hover:text-orange-500 dark:text-orange-500 dark:hover:text-orange-400"
  >{job.name}</a
>
