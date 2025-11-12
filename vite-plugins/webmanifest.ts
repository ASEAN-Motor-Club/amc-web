import type { Plugin } from 'vite';
import { readdir, readFile, stat, writeFile } from 'fs/promises';
import { resolve, join, basename } from 'path';

export function webmanifestPlugin(): Plugin {
  let manifestFileName: string;

  return {
    name: 'webmanifest-generator',
    apply: 'build',
    async generateBundle() {
      const iconDir = resolve(process.cwd(), 'src/lib/assets/images/icon');

      // Emit all icon files and collect their references
      const resolvedAssets: Record<string, string> = {};

      const icons = [
        { key: 'faviconSvg', file: 'favicon.svg' },
        { key: 'androidChrome512', file: 'android-chrome-512x512.png' },
        { key: 'androidChrome192', file: 'android-chrome-192x192.png' },
        { key: 'icoRadio', file: 'ico_radio.png' },
        { key: 'icoMap', file: 'ico_map.png' },
        { key: 'icoJobs', file: 'ico_jobs.png' },
      ];

      for (const { key, file } of icons) {
        const filePath = resolve(iconDir, file);
        const source = await readFile(filePath);
        const referenceId = this.emitFile({
          type: 'asset',
          name: file,
          source,
        });
        resolvedAssets[key] = `/${this.getFileName(referenceId)}`;
      }

      // Create the manifest with resolved asset paths
      const manifest = {
        name: 'ASEAN Motor Club',
        short_name: 'AMC',
        description: "MotorTown's premier community server in Southeast Asia",
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        theme_color: 'oklch(19.2% 0.014 114.28)',
        background_color: 'oklch(19.2% 0.014 114.28)',
        scope: '/',
        lang: 'en',
        categories: ['games', 'entertainment', 'social'],
        icons: [
          {
            src: resolvedAssets.faviconSvg,
            sizes: 'any',
          },
          {
            src: resolvedAssets.androidChrome512,
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: resolvedAssets.androidChrome192,
            sizes: '192x192',
            type: 'image/png',
          },
        ],
        shortcuts: [
          {
            name: 'Radio',
            short_name: 'Radio',
            description: 'Listen to AMC Radio',
            url: '/radio',
            icons: [{ src: resolvedAssets.icoRadio, sizes: 'any', purpose: 'monochrome' }],
          },
          {
            name: 'Map',
            short_name: 'Map',
            description: 'View the interactive map',
            url: '/map',
            icons: [{ src: resolvedAssets.icoMap, sizes: 'any', purpose: 'monochrome' }],
          },
          {
            name: 'Jobs',
            short_name: 'Jobs',
            description: 'View available jobs',
            url: '/jobs',
            icons: [{ src: resolvedAssets.icoJobs, sizes: 'any', purpose: 'monochrome' }],
          },
        ],
      };

      const manifestContent = JSON.stringify(manifest);

      // Emit the manifest as a build asset
      const manifestReferenceId = this.emitFile({
        type: 'asset',
        name: 'manifest.json',
        source: manifestContent,
      });
      manifestFileName = this.getFileName(manifestReferenceId);

      console.log(
        `\n✓ Generated ${manifestFileName} with ${Object.keys(resolvedAssets).length} resolved assets`,
      );
    },
    async closeBundle() {
      // After all bundles are written, update HTML files
      const buildDir = resolve(process.cwd(), 'build');
      const manifestLink = `<link rel="manifest" href="/${manifestFileName}">`;

      const updateHtmlFile = async (filePath: string) => {
        try {
          let html = await readFile(filePath, 'utf-8');
          if (!html.includes('rel="manifest"')) {
            html = html.replace('</head>', `${manifestLink}</head>`);
            await writeFile(filePath, html);
            console.log(`  ✓ Added manifest link to ${basename(filePath)}`);
          }
        } catch {
          // Ignore errors
        }
      };

      const walkDir = async (dir: string) => {
        try {
          const files = await readdir(dir);
          for (const file of files) {
            const filePath = join(dir, file);
            const fileStat = await stat(filePath);
            if (fileStat.isDirectory()) {
              await walkDir(filePath);
            } else if (file.endsWith('.html')) {
              await updateHtmlFile(filePath);
            }
          }
        } catch {
          // Ignore errors
        }
      };
      await walkDir(buildDir);
    },
  };
}
