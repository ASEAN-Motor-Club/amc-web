# CUE4Parse knowledge (for the pakop WASM module)

Facts verified against [FabianFG/CUE4Parse](https://github.com/FabianFG/CUE4Parse) master (v1.2.2, net10.0) during the Rust→C# pakop conversion (2026-07). Re-verify against the pinned NuGet version when upgrading.

## Reading a .pak from memory

- `new PakFileReader(new FByteArchive(name, byte[] data, VersionContainer))` then `reader.Mount(StringComparer.Ordinal)` — **fully synchronous** (reads/validates the index inline) and populates `reader.Files: IReadOnlyDictionary<string, GameFile>`.
- `AbstractVfsReader.ValidateMountPoint` normalizes the mount point: `"../../../X/…"` → `"X/…"` (leading `"../../.."` then leading `/` stripped); a mount point _not_ starting with `"../../.."` is forced to `""` (root). `Files` keys = validated MountPoint + raw index path — i.e. already the mount-joined, prefix-stripped forward-slash paths (same normalization the old Rust `repak` code did by hand). Recover the raw index path with `path[reader.MountPoint.Length..]`.
- `gameFile.Read()` returns the **decompressed** file bytes (extraction handles per-block compression internally).

## Compression — all managed, wasm-safe

- `CUE4Parse.Compression.Compression` uses OffiUtils `DecompressorBuilder.Default` + CUE4Parse additions. Defaults are **pure managed**: Deflate/Gzip/Zlib/Brotli (System.IO.Compression), LZ4 (K4os), Zstd (ZstdSharp.Port), **Oodle (OodleSharp — pure C# port)**.
- `OodleHelper.Initialize` / `ZlibHelper.Initialize` / CUE4Parse-Natives load **native shared libraries at runtime** (better perf on desktop). Never call them on browser wasm — not needed, and they can't work there.

## uasset parsing with .usmap mappings

- `new Package(name, byte[] uasset, byte[]? uexp, provider: IFileProvider)` parses from memory; `package.GetExports()` yields `UObject`s. The provider is only consulted for `MappingsForGame` and versions.
- Mappings from a byte buffer: subclass `UsmapTypeMappingsProvider` and call `Load(byte[])` (the built-in `FileUsmapTypeMappingsProvider` is path-only). Attach via `provider.MappingsContainer`.
- Engine version: `new VersionContainer(EGame.GAME_UE5_5)` (Motor Town's current engine; the old Rust code hardcoded VER_UE5_2, which the game has since outgrown). Version choice matters: at 5.2 some Schedule-I mod assets failed to parse that 5.5 handles.
- `UDataTable.RowMap: Dictionary<FName, FStructFallback>`; with mappings, rows deserialize via `FStructFallback` even when the RowStruct import can't be loaded (warning, no throw).
- **FName**: use `.PlainText` for the bare name (≡ unreal*asset's `get_owned_content()`); `.Text` appends `*{Number-1}`when`Number > 0`.

## Browser-WASM gotchas

- **Never call `AbstractVfsFileProvider.Mount()`** (or anything doing `.Result` over `Task.Run`) on single-threaded browser wasm — it deadlocks. Mount `PakFileReader` directly (sync); a never-mounted `StreamedFileProvider` works fine as a mappings/versions carrier.
- **Trimming**: `ObjectTypeRegistry` maps serialized class names → C# types by reflecting over `assembly.DefinedTypes`; full IL trimming silently drops types like `UDataTable` (exports fall back to generic objects). We use `TrimMode=partial` + `TrimmerRootAssembly` for `CUE4Parse` and `Newtonsoft.Json`. A future size win: `TrimMode=full` + explicit `ObjectTypeRegistry.RegisterClass(...)` for the handful of types we need.
- **JSExport marshaling** (`System.Runtime.InteropServices.JavaScript`): `byte[]↔Uint8Array`, `string`, `string[]`, `bool` marshal directly; arbitrary object arrays don't — pakop returns `FileEntry[]` as a JSON string (System.Text.Json source-gen, trim-safe) parsed in the JS shim.
- Managed exceptions from `[JSExport]` methods surface in JS as `Error` with the exception message (the pak pages display `e.message`).
- The runtime is loaded via `import { dotnet } from './bin/Release/net10.0/wwwroot/_framework/dotnet.js'` (direct path into the dotnet build output) → `dotnet.create()` → `getAssemblyExports(getConfig().mainAssemblyName)`. `WasmBundlerFriendlyBootConfig` (set in the csproj, with `CompressionEnabled=false` and `DebugType=none`) makes `dotnet.js` **statically import every runtime asset**, so Vite bundles the whole graph with content-hashed names into `_app/immutable/assets/` — fully cache-safe, no plugin or alias needed. `assetsInclude: [/_framework\/.+\.(wasm|pdb|dat)$/]` in `vite.config.ts` makes the WebCIL `.wasm` imports resolve as asset URLs instead of wasm modules.

## Known behavior deltas vs the old Rust module (verified over real mod paks, 2026-07)

- `list`/`list_hash`: **exact parity** (paths + SHA-256) over all tested paks; entry order can differ from pak-index order in rare cases (conflict page groups by path, so harmless).
- **Stale usmap truncates DataTable rows**: if a mod is cooked against a game build newer than `Mappings718.usmap`, structs can carry properties unknown to the schema. CUE4Parse throws mid-table by design (unversioned data can't be skipped), and the partially-filled `RowMap` is kept — e.g. qxZap_MoreTuning's AeroParts yields 270/353 rows. The old `unreal_asset` parser silently stopped reading a struct at the first unknown property, which happened to keep alignment there. **Fix is refreshing the .usmap for the current game version**, not code.
- Where the old parser hard-crashed (`unreachable` wasm panic, e.g. Schedule-I's Cargos.uasset), CUE4Parse degrades gracefully (partial/empty rows, logged warning).
- DataTable row-name order relies on C# `Dictionary` insertion order (holds in practice; the conflict page only does set membership).
- Mount points not starting with `../../..` normalize to root (`""`) instead of being kept verbatim — irrelevant for real mod paks.
- `list_hash` returns plain JSON objects, not wasm-bindgen class instances (no `free()`; consumers only read properties).
