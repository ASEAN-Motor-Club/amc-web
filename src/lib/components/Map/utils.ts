import { clientSearchParams } from '$lib/utils/clientSearchParamsGet';
import { isSm } from '$lib/utils/media.svelte';
import { SvelteURLSearchParams } from 'svelte/reactivity';

export const enum Features {
  House,
  Player,
  Delivery,
}

export const enum DetailsFeatures {
  Delivery,
  Jobs,
}

export const getLinkHref = (
  showFull: boolean,
  feature: DetailsFeatures,
  id: string | number,
): string => {
  const newParams = new SvelteURLSearchParams(clientSearchParams());
  let menu: 'deliveries' | 'jobs';
  switch (feature) {
    case DetailsFeatures.Delivery: {
      newParams.delete('player');
      newParams.delete('house');
      newParams.set('delivery', id.toString());
      menu = 'deliveries';
      break;
    }
    case DetailsFeatures.Jobs:
      menu = 'jobs';
      break;
  }
  if (showFull) {
    newParams.delete('menu');
    return `/${menu}/${id}`;
  }
  newParams.set('menu', `${menu}/${id}`);
  return `/map?${newParams.toString()}`;
};

export const getSelectionClearedParams = (): SvelteURLSearchParams => {
  const newParams = new SvelteURLSearchParams(clientSearchParams());
  newParams.delete('delivery');
  newParams.delete('player');
  newParams.delete('house');
  newParams.delete('focus_index');
  return newParams;
};

export const getViewHref = (feature: Features, id: string, keepMenu = false): string => {
  const newParams = getSelectionClearedParams();

  switch (feature) {
    case Features.House: {
      if (isSm.current && !keepMenu) {
        newParams.set('menu', 'housing');
      }
      newParams.set('house', id);
      break;
    }
    case Features.Player: {
      if (isSm.current && !keepMenu) {
        newParams.set('menu', 'players');
      }
      newParams.set('player', id);
      break;
    }
    case Features.Delivery: {
      if (isSm.current && !keepMenu) {
        newParams.set('menu', `deliveries/${id}`);
      }
      newParams.set('delivery', id);
      break;
    }
  }

  return `/map?${newParams.toString()}`;
};
