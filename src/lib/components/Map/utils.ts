import { clientSearchParams } from '$lib/utils/clientSearchParamsGet';
import { isSm } from '$lib/utils/media.svelte';
import { SvelteURLSearchParams } from 'svelte/reactivity';

export const enum Features {
  house,
  player,
  delivery,
}

export const enum DetailsFeatures {
  Delivery = 'delivery',
  Jobs = 'jobs',
}

export const getLinkHref = (
  showFull: boolean,
  feature: DetailsFeatures,
  id: string | number,
): string => {
  const newParams = new SvelteURLSearchParams(clientSearchParams());
  switch (feature) {
    case DetailsFeatures.Delivery: {
      newParams.delete('player');
      newParams.delete('house');
      newParams.set('delivery', id.toString());
      break;
    }
    case DetailsFeatures.Jobs:
      break;
  }
  if (showFull) {
    newParams.delete('menu');
    return `/${feature}/${id}`;
  }
  newParams.set('menu', `${feature}/${id}`);
  return `/map?${newParams.toString()}`;
};

export const getSelectionClearedParams = (): SvelteURLSearchParams => {
  const newParams = new SvelteURLSearchParams(clientSearchParams());
  newParams.delete('delivery');
  newParams.delete('player');
  newParams.delete('house');
  return newParams;
};

export const getViewHref = (feature: Features, id: string): string => {
  const newParams = getSelectionClearedParams();

  switch (feature) {
    case Features.house: {
      if (isSm.current) {
        newParams.set('menu', 'housing');
      }
      newParams.set('house', id);
      break;
    }
    case Features.player: {
      if (isSm.current) {
        newParams.set('menu', 'players');
      }
      newParams.set('player', id);
      break;
    }
    case Features.delivery: {
      if (isSm.current) {
        newParams.set('menu', `delivery/${id}`);
      }
      newParams.set('delivery', id);
      break;
    }
  }

  return `/map?${newParams.toString()}`;
};
