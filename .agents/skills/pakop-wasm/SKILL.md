---
name: pakop-wasm
description: The pakop C#/.NET WASM module (CUE4Parse-based) — what it does (pak-file inspection/hashing), how to build it (pnpm build:pakop), and how to consume it (lazy dynamic import). Read before touching wasm/pakop or the pak routes.
---

# pakop (C# .NET WASM, CUE4Parse)

- C# project at `wasm/pakop/` (`Pakop.csproj`, .NET 10 browser WASM, no Blazor); provides pak-file inspection and hashing (`list`, `list_hash`, `get_datatables_names`, `print_exports`) used by the `/pak` routes (`src/routes/pak/`). Built on [CUE4Parse](https://github.com/FabianFG/CUE4Parse).
- Build is an explicit prebuild step: `pnpm build:pakop` (`dotnet build -c Release`; required before `pnpm dev`/`pnpm build`, rerun after C# changes — in CI the `wasm.yml` workflow builds it once and shares the artifact). Requires .NET SDK 10 + `dotnet workload install wasm-tools`.
- No Vite plugin needed: the shim imports `./bin/Release/net10.0/wwwroot/_framework/dotnet.js` directly. The bundler-friendly `dotnet.js` statically imports every runtime asset, so Vite bundles the whole graph with content-hashed names into `_app/immutable/assets/` (`assetsInclude` in `vite.config.ts` makes the WebCIL `.wasm` imports resolve as asset URLs).
- The npm workspace package `pakop` is the **committed** shim `wasm/pakop/index.js` + `index.d.ts`: it statically imports `/assets/_framework/dotnet.js`, initializes via top-level await, then exposes synchronous functions delegating to `[JSExport]` methods in `Interop.cs`. `list_hash` returns JSON-parsed plain objects.
- **Always lazy-load** to keep the .NET runtime out of the main bundle:

```ts
const { list_hash } = await import('pakop');
```

- C# changes must pass `dotnet format wasm/pakop --verify-no-changes` (enforced by lefthook) and require a rebuild (`pnpm build:pakop`) before the frontend sees them.
- Vite side: `optimizeDeps.exclude: ['pakop']` and `server.fs.allow` includes `wasm/`; the pnpm workspace glob is `wasm/*` (direct children only — the dotnet build output contains a copied `package.json` that a deep glob would pick up as a duplicate workspace package).

Related: [[architecture]], [[git-hooks]], [[path-aliases]]
