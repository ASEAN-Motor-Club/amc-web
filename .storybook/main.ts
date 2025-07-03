import type { StorybookConfig } from '@storybook/sveltekit';

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|ts|svelte)'],
  addons: ['@storybook/addon-themes', '@storybook/addon-svelte-csf'],
  framework: {
    name: '@storybook/sveltekit',
    options: {},
  },
  staticDirs: ['../static'],
  previewHead: (head) => `
    ${head}
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
    />
  `,
};
export default config;
