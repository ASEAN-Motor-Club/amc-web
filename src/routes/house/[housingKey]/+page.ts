import { houses } from '#lib/data/house.ts';

/**
 * Unfurlers (Discord, Slack, Twitter) never run JavaScript. Without a prerendered file per plot
 * they get `fallback.html`, whose head has no `og:title`/`og:url`, so a shared house link renders
 * as a bare image instead of an embed. Prerendering also gives every plot a real canonical URL.
 */
export const prerender = true;

/** Every plot the site knows about; `out_house.json` is the source of truth for the key set. */
export const entries = () => houses.map((house) => ({ housingKey: house.name }));
