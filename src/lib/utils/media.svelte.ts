import { MediaQuery } from 'svelte/reactivity';

export const isMouse = new MediaQuery('(hover) and (pointer: fine)');

export const isLg = new MediaQuery('(min-width: 64rem)');
