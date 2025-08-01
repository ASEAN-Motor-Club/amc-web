import '../src/app.css';
import './unocss-svelte-scoped-global.css';
import type { Preview, SvelteRenderer } from '@storybook/sveltekit';
import { withThemeByClassName } from '@storybook/addon-themes';

const preview: Preview = {
  parameters: {
    controls: {
      expanded: true,
    },
    actions: { argTypesRegex: '^on.*' },
    layout: 'centered',
  },
  decorators: [
    withThemeByClassName<SvelteRenderer>({
      themes: {
        light: 'light',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ],
};

export default preview;
