---
name: pakop-wasm
description: The pakop C#/.NET WASM module (CUE4Parse-based) — what it does (pak-file inspection/hashing), how to build it (pnpm build:pakop), and how to consume it (lazy dynamic import). Read before touching wasm/pakop or the pak routes.
---

# pakop (C# .NET WASM, CUE4Parse)

- C# project at `wasm/pakop/` (`Pakop.csproj`, .NET 10 browser WASM, no Blazor); provides pak-file inspection and hashing (`list`, `list_hash`, `get_datatables_names`, `print_exports`) used by the `/pak` routes (`src/routes/pak/`). Built on [CUE4Parse](https://github.com/FabianFG/CUE4Parse).
- Build is an explicit prebuild step: `pnpm build:pakop` (`dotnet build -c Release`; required before `pnpm dev`/`pnpm build`, rerun after C# changes — in CI the `wasm.yml` workflow builds it once and shares the artifact). Requires .NET SDK 10 + `dotnet workload install wasm-tools`.
- The shim imports `./bin/Release/net10.0/wwwroot/_framework/dotnet.js` directly. The bundler-friendly `dotnet.js` statically imports every runtime `.wasm` asset, so Vite bundles the whole graph with content-hashed names into `_app/immutable/assets/`. Since Vite 8.1, its built-in wasm-ESM integration intercepts direct `.wasm` imports and expects a `default` export from the parsed module — the .NET runtime's `.wasm` blobs don't have one, which breaks the build (`MISSING_EXPORT "default"`). `vite-plugins/dotnet-wasm-asset.ts` (`dotnetWasmAssetPlugin`, registered first in `vite.config.ts`) works around this by resolving those specific `_framework/**/*.{wasm,pdb,dat}` imports with a `?url` suffix, which is exempt from that interception and resolves as a plain asset URL.
- The npm workspace package `pakop` is the **committed** shim `wasm/pakop/index.js` + `index.d.ts`: it statically imports `/assets/_framework/dotnet.js`, initializes via top-level await, then exposes synchronous functions delegating to `[JSExport]` methods in `Interop.cs`. `list_hash` returns JSON-parsed plain objects.
- **Always lazy-load** to keep the .NET runtime out of the main bundle:

```ts
const { list_hash } = await import('pakop');
```

- C# changes must pass `dotnet format wasm/pakop --verify-no-changes` (enforced by lefthook) and require a rebuild (`pnpm build:pakop`) before the frontend sees them.
- Vite side: `optimizeDeps.exclude: ['pakop']` and `server.fs.allow` includes `wasm/`; the pnpm workspace glob is `wasm/*` (direct children only — the dotnet build output contains a copied `package.json` that a deep glob would pick up as a duplicate workspace package).

Related: [[architecture]], [[git-hooks]], [[path-aliases]]
