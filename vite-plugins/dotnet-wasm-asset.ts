import { isBuiltin } from 'node:module';
import type { Plugin } from 'vite';

const dotnetWasmAssetRE = /_framework\/.+\.(wasm|pdb|dat)$/;
const dotnetFrameworkJsRE = /\/_framework\/[^/]+\.js(\?|$)/;

/**
 * Vite's built-in wasm-ESM integration intercepts every direct `.wasm` import and
 * treats it as a real WebAssembly module (expecting a `default` export from the
 * generated glue code). The .NET runtime's own `.wasm` blobs aren't built for that
 * convention, so force these specific imports through the `?url` asset path instead,
 * which is exempt from that interception.
 *
 * The runtime JS also does `import(/*! webpackIgnore: true *\/"process")` (and `"module"`)
 * behind Node-only guards. Vite doesn't honour webpack's magic comment, so it would
 * resolve them to its browser-external stub and warn; keep them as untouched externals.
 */
export function dotnetWasmAssetPlugin(): Plugin {
  return {
    name: 'amc-web:dotnet-wasm-asset',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (importer && dotnetFrameworkJsRE.test(importer) && isBuiltin(source)) {
        return { id: source, external: true };
      }
      if (source.includes('?')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved || resolved.external || !dotnetWasmAssetRE.test(resolved.id)) return null;
      return `${resolved.id}?url`;
    },
  };
}
