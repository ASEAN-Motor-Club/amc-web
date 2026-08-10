---
description: The pakop C#/.NET WASM module — when to rebuild it, how to import it, and the build wiring that keeps the dotnet runtime out of the main bundle.
globs:
  - wasm/**
  - src/routes/pak/**
---

# pakop (C# .NET WASM)

`wasm/pakop/` is a .NET browser-WASM project (CUE4Parse, no Blazor) that inspects and hashes pak files for the `/pak` routes. The workspace package `pakop` is the committed JS shim beside the C#, which imports the dotnet build output and re-exports the `[JSExport]` methods in `Interop.cs`.

- **Rebuild after every C# change**: `pnpm build:pakop`, also required before `pnpm dev`/`pnpm build` on a fresh checkout. Needs the .NET SDK plus the `wasm-tools` workload. CI builds it once and shares the artifact, so the site build itself never needs .NET.
- C# must pass `dotnet format wasm/pakop --verify-no-changes` (pre-commit and CI).
- **Always lazy-load** so the runtime stays out of the main bundle: `const { list_hash } = await import('pakop');`
- Three pieces of wiring are load-bearing: the `wasm/*` workspace glob (a deep glob would pick up the `package.json` copied into the build output), `server.fs.allow: ['wasm']`, and `dotnetWasmAssetPlugin()` first in the Vite plugin list — it rewrites `_framework/**` asset imports to `?url`, without which Vite's wasm-ESM handling fails the build on a missing `default` export.
