import { defineConfig, transformerDirectives } from 'unocss';
import extractorSvelte from '@unocss/extractor-svelte';
import amcConfig from 'amc-uno-css-config';

export default defineConfig({
  ...amcConfig,
  theme: {
    ...amcConfig.theme,
    font: {
      ...amcConfig.theme?.font,
      cursive: "'Great Vibes', cursive",
    },
  },
  transformers: [transformerDirectives()],
  extractors: [extractorSvelte()],
  blocklist: [
    // paraglide message
    /^m(\.\w|\[['"])/,
    // margin/padding/width/height without separator like mx2, w10
    /^[pm][trblxyse]?\d+$/,
    /^[wh]\d+$/,
  ],
});
