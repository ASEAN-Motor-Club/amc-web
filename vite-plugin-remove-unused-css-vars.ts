import type { Plugin } from 'vite';
import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import { gzip } from 'zlib';
import { promisify } from 'util';

const gzipAsync = promisify(gzip);

export default function removeUnusedCssVars(): Plugin {
  return {
    name: 'vite-plugin-remove-unused-css-vars',
    apply: 'build',
    async closeBundle() {
      const buildDir = path.resolve(process.cwd(), 'build');
      const assetsDir = path.join(buildDir, '_app', 'immutable', 'assets');

      // Step 1: Find all CSS files and collect all used CSS variables
      const cssFiles = await glob(path.join(assetsDir, '*.css').replace(/\\/g, '/'));
      const usedVars = new Set<string>();
      const varUsageRegex = /var\((--[^,)]+)/g;

      for (const file of cssFiles) {
        const content = await fs.readFile(file, 'utf-8');
        let match;
        while ((match = varUsageRegex.exec(content)) !== null) {
          usedVars.add(match[1].trim());
        }
      }

      // Step 2: Find the unocss global CSS file
      const unocssGlobalFiles = await glob(
        path.join(assetsDir, 'unocss-svelte-scoped-global.*.css').replace(/\\/g, '/'),
      );
      if (unocssGlobalFiles.length === 0) {
        console.warn('Could not find unocss-svelte-scoped-global.*.css file.');
        return;
      }
      const unocssFile = unocssGlobalFiles[0];
      const beforeStats = await fs.stat(unocssFile);
      const unocssContent = await fs.readFile(unocssFile, 'utf-8');
      const beforeGzip = await gzipAsync(unocssContent);

      // Step 3: Find the :root, :host block and remove unused variables
      const rootHostRegex =
        /((?:[:\w\s,.-]*):host(?:[:\w\s,.-]*)|(?:[:\w\s,.-]*):root(?:[:\w\s,.-]*))\s*{([^}]+)}/;
      const rootMatch = unocssContent.match(rootHostRegex);

      if (rootMatch) {
        const fullBlock = rootMatch[0];
        const selector = rootMatch[1]
          .split(',')
          .map((s) => s.trim())
          .filter((value, index, self) => self.indexOf(value) === index)
          .join(', ');
        const variablesBlock = rootMatch[2];
        const varDefinitionRegex = /(--[^:]+):[^;]+;/g;
        let match;
        const definedVars = new Map<string, string>();
        while ((match = varDefinitionRegex.exec(variablesBlock)) !== null) {
          definedVars.set(match[1].trim(), match[0]);
        }

        const keptVars = [];
        for (const [varName, varDefinition] of definedVars.entries()) {
          if (usedVars.has(varName)) {
            keptVars.push(varDefinition.trim());
          }
        }

        const newVariablesBlock = keptVars.join(' ');

        const newCss = unocssContent.replace(fullBlock, `${selector} {${newVariablesBlock}}`);
        await fs.writeFile(unocssFile, newCss, 'utf-8');
        const afterStats = await fs.stat(unocssFile);
        const afterGzip = await gzipAsync(newCss);
        console.log(`Removed unused CSS variables from ${path.basename(unocssFile)}.`);
        console.log(`  Before: ${(beforeStats.size / 1024).toFixed(2)} KB`);
        console.log(`  After:  ${(afterStats.size / 1024).toFixed(2)} KB`);
        console.log(`  Before (gzip): ${(beforeGzip.length / 1024).toFixed(2)} KB`);
        console.log(`  After (gzip):  ${(afterGzip.length / 1024).toFixed(2)} KB`);

        const svelteKitClientDir = path.resolve(
          process.cwd(),
          '.svelte-kit',
          'output',
          'client',
          '_app',
          'immutable',
          'assets',
        );
        const svelteKitServerDir = path.resolve(
          process.cwd(),
          '.svelte-kit',
          'output',
          'server',
          '_app',
          'immutable',
          'assets',
        );
        const fileName = path.basename(unocssFile);

        for (const destDir of [svelteKitClientDir, svelteKitServerDir]) {
          try {
            await fs.access(destDir);
            const destPath = path.join(destDir, fileName);
            await fs.copyFile(unocssFile, destPath);
            console.log(`Copied optimized CSS to ${path.relative(process.cwd(), destDir)}`);
          } catch {
            // ignore if the directory doesn't exist
          }
        }
      }
    },
  };
}
