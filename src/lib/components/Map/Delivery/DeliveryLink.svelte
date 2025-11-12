<script lang="ts">
  import { deliveryPointsMap } from '$lib/data/deliveryPoint';
  import { getMtLocale } from '$lib/utils/getMtLocale';
  import type { ClassValue } from 'svelte/elements';
  import { DetailsFeatures, Features, getLinkHref, getViewHref } from '../utils';
  import Icon from '$lib/ui/Icon/Icon.svelte';
  import Button from '$lib/ui/Button/Button.svelte';
  import TruncateText from '$lib/ui/TruncateText/TruncateText.svelte';

  export interface DeliveryLinkProps {
    fullScreen: boolean;
    guid: string;
    class?: ClassValue;
    wrapperClass?: ClassValue;
    truncate?: boolean;
  }

  const {
    fullScreen,
    guid,
    class: propsClass,
    wrapperClass,
    truncate,
  }: DeliveryLinkProps = $props();

  const text = $derived.by(() => {
    const deliveryPoint = deliveryPointsMap.get(guid);
    if (!deliveryPoint?.name) return '';
    return getMtLocale(deliveryPoint.name);
  });

  const baseClass =
    'text-yellow-700 hover:text-yellow-600 dark:text-yellow-500 dark:hover:text-yellow-400';
</script>

<span class={['inline-flex items-baseline', wrapperClass]}>
  {#if truncate}
    <TruncateText
      tag="a"
      extra={{ href: getLinkHref(fullScreen, DetailsFeatures.Delivery, guid) }}
      class={[baseClass, propsClass]}
      {text}
    />
  {:else}
    <a
      class={[baseClass, propsClass]}
      href={getLinkHref(fullScreen, DetailsFeatures.Delivery, guid)}>{text}</a
    >
  {/if}
  <Button
    class="translate-y-0.4 flex bg-transparent text-yellow-950 hover:bg-yellow-600/20 active:bg-yellow-800/20 dark:text-yellow-100"
    size="xs"
    icon
    tag="a"
    href={getViewHref(Features.Delivery, guid, !fullScreen)}
    variant="contained-light"
  >
    <Icon class="i-material-symbols:map-search-rounded" size="sm" />
  </Button>
</span>
