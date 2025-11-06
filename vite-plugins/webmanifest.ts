import type { Plugin } from 'vite';
import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';

export function webmanifestPlugin(): Plugin {
  let manifestFileName: string;

  return {
    name: 'webmanifest-generator',
    apply: 'build',
    generateBundle() {
      const iconDir = resolve(process.cwd(), 'src/lib/assets/images/icon');

      // Emit all icon files and collect their references
      const resolvedAssets: Record<string, string> = {};

      const icons = [
        { key: 'faviconMonochrome', file: 'favicon_monochrome.svg' },
        { key: 'faviconSvg', file: 'favicon.svg' },
        { key: 'androidChrome512', file: 'android-chrome-512x512.png' },
        { key: 'androidChrome192', file: 'android-chrome-192x192.png' },
        { key: 'icoRadio', file: 'ico_radio.svg' },
        { key: 'icoMap', file: 'ico_map.svg' },
        { key: 'icoJobs', file: 'ico_jobs.svg' },
      ];

      for (const { key, file } of icons) {
        const filePath = resolve(iconDir, file);
        const source = readFileSync(filePath);
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
            src: resolvedAssets.faviconMonochrome,
            sizes: 'any',
            purpose: 'monochrome',
          },
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

      // Generate hash in Vite's format (Base64-like, 8 chars)
      const hash = createHash('sha256').update(manifestContent).digest('base64url').slice(0, 8);

      manifestFileName = `manifest.${hash}.json`;

      // Emit the manifest as a build asset
      this.emitFile({
        type: 'asset',
        fileName: manifestFileName,
        source: manifestContent,
      });

      console.log(
        `✓ Generated ${manifestFileName} with ${Object.keys(resolvedAssets).length} resolved assets`,
      );
    },
    async closeBundle() {
      // After all bundles are written, update HTML files
      const fs = await import('fs');
      const path = await import('path');

      const buildDir = path.resolve(process.cwd(), 'build');
      const manifestLink = `<link rel="manifest" href="/${manifestFileName}">`;

      const updateHtmlFile = (filePath: string) => {
        try {
          let html = fs.readFileSync(filePath, 'utf-8');
          if (!html.includes('rel="manifest"')) {
            html = html.replace('</head>', `${manifestLink}</head>`);
            fs.writeFileSync(filePath, html);
            console.log(`  ✓ Added manifest link to ${path.basename(filePath)}`);
          }
        } catch {
          // Ignore errors
        }
      };

      const walkDir = (dir: string) => {
        try {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
              walkDir(filePath);
            } else if (file.endsWith('.html')) {
              updateHtmlFile(filePath);
            }
          }
        } catch {
          // Ignore errors
        }
      };
      walkDir(buildDir);
    },
  };
}
