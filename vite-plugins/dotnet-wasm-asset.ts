import type { Plugin } from 'vite';

const dotnetWasmAssetRE = /_framework\/.+\.(wasm|pdb|dat)$/;

/**
 * Vite's built-in wasm-ESM integration intercepts every direct `.wasm` import and
 * treats it as a real WebAssembly module (expecting a `default` export from the
 * generated glue code). The .NET runtime's own `.wasm` blobs aren't built for that
 * convention, so force these specific imports through the `?url` asset path instead,
 * which is exempt from that interception.
 */
export function dotnetWasmAssetPlugin(): Plugin {
  return {
    name: 'amc-web:dotnet-wasm-asset',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source.includes('?')) return null;
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true });
      if (!resolved || resolved.external || !dotnetWasmAssetRE.test(resolved.id)) return null;
      return `${resolved.id}?url`;
    },
  };
}
