<script lang="ts">
  import { deliveryPointsMap } from '$lib/data/deliveryPoint';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import type { ClassValue } from 'svelte/elements';
  import { DetailsFeatures, getLinkHref } from '../utils';

  export interface DeliveryLinkProps {
    fullScreen: boolean;
    guid: string;
    class?: ClassValue;
  }

  const { fullScreen, guid, class: className }: DeliveryLinkProps = $props();
</script>

<a
  class={[
    'text-yellow-700 underline hover:text-yellow-600 dark:text-yellow-500 dark:hover:text-yellow-400',
    className,
  ]}
  href={getLinkHref(fullScreen, DetailsFeatures.Delivery, guid)}
  >{getMtLocale(deliveryPointsMap.get(guid)?.name ?? {})}</a
>
