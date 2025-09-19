import type { DeliveryPointInfo } from '$lib/api/types';
import { SvelteMap } from 'svelte/reactivity';

export const deliveryInfoCaches = new SvelteMap<string, [Date, DeliveryPointInfo]>();
