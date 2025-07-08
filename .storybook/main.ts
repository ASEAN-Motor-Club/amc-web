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
    ${head}
    ${configType === 'PRODUCTION' ? '<base href="/storybook/" />' : ''}
  `,
};
export default config;
