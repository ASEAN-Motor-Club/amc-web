import type { Plugin } from 'vite';

// Handles wasm-bindgen --target bundler output without parsing the WASM binary.
//
// wasm-bindgen emits an entry file like:
//   import * as wasm from "./xxx_bg.wasm";
//   import { __wbg_set_wasm } from "./xxx_bg.js";
//   __wbg_set_wasm(wasm);
//
// Rolldown (Vite 8) cannot resolve the ESM WASM namespace import natively.
//
// Client: transforms the entry .js to use WebAssembly.instantiateStreaming with
//   a proxy import object — no WASM binary parsing needed.
// SSR: returns an empty module for .wasm files so `import * as wasm` gives {}
//   and __wbg_set_wasm({}) runs harmlessly; wasm functions are never called in SSR.
export function wasmBindgenPlugin(): Plugin {
  return {
    name: 'vite-wasm-bindgen',
    enforce: 'pre',

    transform(code, id) {
      if (!id.endsWith('.js')) return null;

      const match = /^import\s+\*\s+as\s+wasm\s+from\s+"(\.\/[^"]+\.wasm)";?/m.exec(code);
      if (!match) return null;

      const wasmRelPath = match[1]; // e.g. "./wasm_map_bg.wasm"
      const bgJsRelPath = wasmRelPath.replace(/\.wasm$/, '.js'); // "./wasm_map_bg.js"

      let out = code;

      // 1. Replace the WASM namespace import
      out = out.replace(
        match[0],
        `import _wasmUrl from "${wasmRelPath}?url"\nimport * as _bgImports from "${bgJsRelPath}"`,
      );

      // 2. Detect optional wasm.__wbindgen_start() call (present in some crates)
      const hasStart = /^wasm\.__wbindgen_start\(\);?$/m.test(out);
      if (hasStart) out = out.replace(/^wasm\.__wbindgen_start\(\);?\n?/m, '');

      // 3. Replace __wbg_set_wasm(wasm) with the full async instantiation block.
      //    The import proxy forwards any module/function lookup to the bg exports,
      //    so we don't need to know the WASM import section's module specifier.
      out = out.replace(
        /^__wbg_set_wasm\(wasm\);?$/m,
        `let _wasmInst = {}
if (!import.meta.env.SSR) {
  const _imp = new Proxy({}, { get: (_, _m) => new Proxy({}, { get: (_, f) => (_bgImports)[f] }) })
  const { instance: _wi } = await WebAssembly.instantiateStreaming(fetch(_wasmUrl), _imp)
  __wbg_set_wasm(_wi.exports)${hasStart ? '\n  _wi.exports.__wbindgen_start()' : ''}
  _wasmInst = _wi.exports
}`,
      );

      // 4. Replace export { wasm as X } — use the module-level _wasmInst instead
      out = out.replace(/export\s*\{\s*wasm\s+as\s+(\w+)\s*\}/g, 'export { _wasmInst as $1 }');

      return { code: out, map: null };
    },
  };
}
