import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
  addons: ['@storybook/addon-themes', '@storybook/addon-svelte-csf'],
  framework: {
    name: '@storybook/sveltekit',
    options: {},
  },
  staticDirs: ['../static'],
  viteFinal: async (config, { configType }) => {
    if (configType === 'PRODUCTION') {
      config.base = '/storybook/';
    }
    return config;
  },
  managerHead: (head, { configType }) => `
    ${configType === 'PRODUCTION' ? '<base href="/storybook/" />' : ''}
     <link
      href="https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,100..900;1,100..900&family=Playpen+Sans:wght@100..800&display=swap"
      rel="stylesheet"
    />
    ${head}
  `,
};
export default config;
