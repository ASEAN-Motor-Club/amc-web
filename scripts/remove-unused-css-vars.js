import { promises as fs } from 'fs';
import path from 'path';
import { glob } from 'glob';
import { gzip } from 'zlib';
import { promisify } from 'util';
import { createHash } from 'crypto';

const gzipAsync = promisify(gzip);

function generateContentHash(content) {
  return createHash('sha256').update(content).digest('hex').substring(0, 8);
}

async function updateFileReferences(oldFileName, newFileName, searchDirs) {
  const extensions = ['*.html', '*.js', '*.ts', '*.svelte', '*.json'];
  const allFiles = [];

  for (const searchDir of searchDirs) {
    for (const ext of extensions) {
      // Regular search pattern
      const files = await glob(path.join(searchDir, '**', ext).replace(/\\/g, '/'));
      allFiles.push(...files);

      // Also search specifically in .vite directories
      const viteFiles = await glob(
        path.join(searchDir, '**', '.vite', '**', ext).replace(/\\/g, '/'),
      );
      allFiles.push(...viteFiles);
    }
  }

  let updatedCount = 0;
  for (const file of allFiles) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes(oldFileName)) {
        let newContent = content;

        // Special handling for manifest.json files
        if (path.basename(file) === 'manifest.json') {
          // For manifest.json, we need to update both the key and the file reference
          const oldKey = `_${oldFileName}`;
          const newKey = `_${newFileName}`;

          // Update the key in the manifest
          newContent = newContent.replace(
            new RegExp(`"${oldKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`, 'g'),
            `"${newKey}"`,
          );

          // Update the file path in the "file" property
          const oldFilePath = `_app/immutable/assets/${oldFileName}`;
          const newFilePath = `_app/immutable/assets/${newFileName}`;
          newContent = newContent.replace(
            new RegExp(oldFilePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            newFilePath,
          );
        } else {
          // For other files, do a simple replace
          newContent = content.replace(
            new RegExp(oldFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
            newFileName,
          );
        }

        if (newContent !== content) {
          await fs.writeFile(file, newContent, 'utf-8');
          updatedCount++;
          console.log(`Updated reference in ${path.relative(process.cwd(), file)}`);
        }
      }
    } catch {
      // Skip files that can't be read
    }
  }

  return updatedCount;
}

async function removeUnusedCssVars() {
  try {
    const buildDir = path.resolve(process.cwd(), 'build');
    const assetsDir = path.join(buildDir, '_app', 'immutable', 'assets');

    // Step 1: Find all CSS files and collect all used CSS variables
    const cssFiles = await glob(path.join(assetsDir, '*.css').replace(/\\/g, '/'));
    const usedVars = new Set();
    const varUsageRegex = /var\(\s*(--[^,)\s]+)/g;

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
      const definedVars = new Map();
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

      // Generate new hash based on optimized content
      const newHash = generateContentHash(newCss);
      const oldFileName = path.basename(unocssFile);
      const newFileName = oldFileName.replace(
        /unocss-svelte-scoped-global\.[^.]+\.css/,
        `unocss-svelte-scoped-global.${newHash}.css`,
      );
      const newFilePath = path.join(path.dirname(unocssFile), newFileName);

      // Write optimized CSS to new file
      await fs.writeFile(newFilePath, newCss, 'utf-8');

      // Remove old file
      await fs.unlink(unocssFile);

      const afterStats = await fs.stat(newFilePath);
      const afterGzip = await gzipAsync(newCss);
      console.log(`Removed unused CSS variables and renamed ${oldFileName} to ${newFileName}.`);
      console.log(`  Before: ${(beforeStats.size / 1024).toFixed(2)} KB`);
      console.log(`  After:  ${(afterStats.size / 1024).toFixed(2)} KB`);
      console.log(`  Before (gzip): ${(beforeGzip.length / 1024).toFixed(2)} KB`);
      console.log(`  After (gzip):  ${(afterGzip.length / 1024).toFixed(2)} KB`);

      // Update all references to the old filename in build directory
      const buildSearchDirs = [buildDir];
      const buildUpdatedCount = await updateFileReferences(
        oldFileName,
        newFileName,
        buildSearchDirs,
      );
      console.log(
        `Updated ${buildUpdatedCount} file(s) with new CSS filename reference in build directory.`,
      );

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
      const svelteKitOutputDir = path.resolve(process.cwd(), '.svelte-kit', 'output');

      // Remove old hash files from SvelteKit directories and copy new ones
      for (const destDir of [svelteKitClientDir, svelteKitServerDir]) {
        try {
          await fs.access(destDir);

          // Remove old hash file if it exists
          const oldDestPath = path.join(destDir, oldFileName);
          try {
            await fs.unlink(oldDestPath);
            console.log(`Removed old CSS file from ${path.relative(process.cwd(), destDir)}`);
          } catch {
            // File doesn't exist, which is fine
          }

          // Copy new optimized file
          const destPath = path.join(destDir, newFileName);
          await fs.copyFile(newFilePath, destPath);
          console.log(`Copied optimized CSS to ${path.relative(process.cwd(), destDir)}`);
        } catch {
          // ignore if the directory doesn't exist
        }
      }

      // Update all references to the old filename in .svelte-kit/output directory
      try {
        await fs.access(svelteKitOutputDir);
        const svelteKitSearchDirs = [svelteKitOutputDir];
        const svelteKitUpdatedCount = await updateFileReferences(
          oldFileName,
          newFileName,
          svelteKitSearchDirs,
        );
        console.log(
          `Updated ${svelteKitUpdatedCount} file(s) with new CSS filename reference in .svelte-kit/output directory.`,
        );
      } catch {
        // .svelte-kit/output directory doesn't exist
        console.log('No .svelte-kit/output directory found to update references.');
      }
    } else {
      console.warn('Could not find :root or :host block in CSS file.');
    }
  } catch (error) {
    console.error('Error removing unused CSS variables:', error);
    process.exit(1);
  }
}

// Run the script
removeUnusedCssVars();
