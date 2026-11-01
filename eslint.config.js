// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from 'eslint-plugin-storybook';

import prettier from 'eslint-config-prettier';
import js from '@eslint/js';
import { includeIgnoreFile } from '@eslint/compat';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import { fileURLToPath } from 'node:url';
import ts from 'typescript-eslint';
import importX from 'eslint-plugin-import-x';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { loadConfig } from '@sveltejs/load-config';
import { defineConfig } from 'eslint/config';

const svelteConfig = (await loadConfig('./', { traverse: false }))?.config;

const gitignorePath = fileURLToPath(new URL('./.gitignore', import.meta.url));

const extraFileExtensions = ['.svelte'];

export default defineConfig(
  includeIgnoreFile(gitignorePath),
  { ignores: ['**/*_pb.ts', 'wasm/*'] },
  js.configs.recommended,
  ...ts.configs.strictTypeChecked,
  ...ts.configs.stylisticTypeChecked,
  ...svelte.configs.recommended,
  prettier,
  ...svelte.configs.prettier,
  {
    plugins: { 'import-x': importX },
    settings: {
      'import-x/resolver-next': [
        createTypeScriptImportResolver({ extensions: ['.ts', '.js', '.svelte', '.d.ts'] }),
      ],
    },
    rules: {
      // Local specifiers name the real file on disk (`#lib/date.ts`, `./paraglide/runtime.js`,
      // `../utils/index.ts`); `.js` → `.ts` mismatches are reported because the resolved file wins.
      'import-x/extensions': [
        'error',
        'ignorePackages',
        {
          checkTypeImports: true,
          // SvelteKit virtual modules have no file behind them.
          pathGroupOverrides: [{ pattern: '$app/**', action: 'ignore' }],
        },
      ],
    },
  },
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        projectService: true,
        extraFileExtensions,
        parser: ts.parser,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
      '@typescript-eslint/method-signature-style': 'error',
      'svelte/no-navigation-without-resolve': 'off',
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'zod',
              message: 'Use zod/mini instead for smaller bundle size',
              allowTypeImports: true,
            },
            {
              name: 'ol/source',
              message:
                'Import the source by deep path (e.g. ol/source/ImageTile). The barrel loads ol/source/GeoTIFF → web-worker, which crashes prerender.',
              allowTypeImports: true,
            },
          ],
          patterns: [
            {
              group: ['date-fns', 'date-fns/*'],
              message: 'Use unified imports from #lib/date.ts instead',
              allowTypeImports: true,
            },
            {
              group: ['react', 'react/*'],
              message: 'React is not allowed in Svelte projects (but installed for storybook)',
            },
          ],
        },
      ],
      // too strict
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      // not play nice with svelte, tend to report svelte type as any or error
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-confusing-void-expression': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/prefer-nullish-coalescing': 'off',
      // it confuse type sometimes
      '@typescript-eslint/restrict-plus-operands': 'off',
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        extraFileExtensions,
        parser: ts.parser,
        svelteConfig,
      },
    },
    rules: {
      // `void state;` inside `$effect` is how a dependency is tracked without using its value.
      '@typescript-eslint/no-meaningless-void-operator': 'off',
    },
  },
  storybook.configs['flat/recommended'],
  {
    files: ['*.config.{js,ts}', '**/*.{test,spec}.{js,ts}', '.storybook/*.ts'],
    extends: [ts.configs.disableTypeChecked],
  },
);
