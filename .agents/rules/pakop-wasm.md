---
description: The pakop C#/.NET WASM module (CUE4Parse) — what it exposes, how to build it, and how the pak routes consume it.
globs:
  - wasm/**
  - src/routes/pak/**
---

# pakop (C# .NET WASM)

`wasm/pakop/` is a .NET 10 browser-WASM project (`Pakop.csproj`, `Microsoft.NET.Sdk.WebAssembly`, no Blazor) built on [CUE4Parse](https://github.com/FabianFG/CUE4Parse). It inspects and hashes pak files for the `/pak` routes. C# sources: `Program.cs`, `Interop.cs`, `PakOps.cs`, `BytesUsmapTypeMappingsProvider.cs`.

## Build

`pnpm build:pakop` (`dotnet build -c Release`) — required before `pnpm dev` / `pnpm build`, and again after any C# change. Needs the .NET 10 SDK plus `dotnet workload install wasm-tools`. CI builds it once in `wasm.yml` and shares the `wasm-pkg` artifact; the CD job downloads that artifact into `wasm/pakop/bin/Release/net10.0/wwwroot`, so the site build itself never needs .NET.

C# must pass `dotnet format wasm/pakop --verify-no-changes` (pre-commit and CI).

## Consuming it

The workspace package `pakop` is the committed shim `wasm/pakop/index.js` + `index.d.ts` (`main.js` is a build-time stub required by `<WasmMainJSPath>`). The shim imports `./bin/Release/net10.0/wwwroot/_framework/dotnet.js`, initializes with top-level await, then exposes synchronous `list`, `list_hash`, `get_datatables_names`, `print_exports` delegating to the `[JSExport]` methods in `Interop.cs`; `list_hash` returns parsed objects.

Always lazy-load so the .NET runtime stays out of the main bundle:

```ts
const { list_hash } = await import('pakop');
```

## Build wiring

- `pnpm-workspace.yaml` globs `wasm/*` (direct children only — a deep glob would pick up the `package.json` copied into the build output as a duplicate package).
- `server.fs.allow: ['wasm']` in `vite.config.ts` lets the shim read out of `wasm/pakop/bin`.
- The bundler-friendly `dotnet.js` statically imports every runtime asset. Since Vite 8.1 the built-in wasm-ESM integration intercepts direct `.wasm` imports and demands a `default` export the .NET blobs don't have (`MISSING_EXPORT "default"`), so `dotnetWasmAssetPlugin` — registered first in `vite.config.ts` — resolves `_framework/**/*.{wasm,pdb,dat}` with a `?url` suffix, which is exempt. Vite then emits them as hashed assets.
