import {
  defineConfig,
  presetWind4,
  presetIcons,
  transformerDirectives,
  presetTypography,
} from 'unocss';
import extractorSvelte from '@unocss/extractor-svelte';

export default defineConfig({
  transformers: [transformerDirectives()],
  extractors: [extractorSvelte()],
  presets: [
    presetIcons({
      extraProperties: {
        display: 'inline-block',
        'user-select': 'none',
      },
    }),
    presetWind4(),
    presetTypography({
      colorScheme: {
        hr: [500, 500],
      },
    }),
  ],
  theme: {
    font: {
      sans: "'Noto Sans Variable', 'Noto Sans SC Variable', 'Noto Sans JP Variable', 'Noto Sans KR Variable', 'Noto Sans Thai Variable', sans-serif",
      'sans-em': 'Koulen, Kanit, sans-serif',
      mono: "'Noto Sans Mono Variable', monospace",
    },
    colors: {
      background: {
        50: 'oklch(0.998 0 0)',
        100: 'oklch(0.981 0 0)',
        200: 'oklch(0.960 0 0)',
        800: 'oklch(0.285 0.020 252.32)',
        900: 'oklch(0.189 0.015 251.9)',
        950: 'oklch(0.150 0.015 252.27)',
      },
      text: {
        DEFAULT: 'oklch(0.208 0.042 265.755)',
        dark: 'oklch(0.968 0.007 247.896)',
      },
      primary: {
        50: 'oklch(0.965 0.017 259.43)',
        100: 'oklch(0.93 0.033 259.42)',
        200: 'oklch(0.862 0.068 260.12)',
        300: 'oklch(0.784 0.11 259.17)',
        400: 'oklch(0.717 0.148 257.91)',
        500: 'oklch(0.65 0.189 256.38)',
        600: 'oklch(0.583 0.204 256.6)',
        700: 'oklch(0.516 0.199 258.95)',
        800: 'oklch(0.44 0.189 260.88)',
        DEFAULT: 'oklch(0.376 0.183 262.64)',
        900: 'oklch(0.376 0.183 262.64)',
        950: 'oklch(0.255 0.109 260.86)',
      },
      accent: {
        DEFAULT: 'oklch(0.622 0.221 23.47)',
      },
      'accent-secondary': {
        DEFAULT: 'oklch(0.911 0.192 103.79)',
      },
    },
    media: {
      'not-touch': 'not ((hover: none) and (pointer: coarse))',
      'not-stylus': 'not ((hover: none) and (pointer: fine))',
      'not-pointer': 'not ((hover) and (pointer: coarse))',
      'not-mouse': 'not ((hover) and (pointer: fine))',
    },
  },
  blocklist: [
    // paraglide message
    /^m(\.\w|\[['"])/,
    // margin/padding/width/height without separator like mx2, w10
    /^[pm][trblxyse]?\d+$/,
    /^[wh]\d+$/,
  ],
});
