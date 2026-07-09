/**
 * JS shim for the pakop .NET wasm module (CUE4Parse-based).
 *
 * The .NET runtime is built by the explicit prebuild step (pnpm build:pakop),
 * imported here straight from its build output. The dotnet build uses
 * WasmBundlerFriendlyBootConfig, so dotnet.js statically imports every
 * runtime asset — Vite bundles the whole graph with content-hashed names
 * (cache-safe end to end).
 *
 * Top-level await keeps the public API synchronous after
 * `await import('pakop')`, matching the old wasm-bindgen module.
 */
import { dotnet } from './bin/Release/net10.0/wwwroot/_framework/dotnet.js';

const { getAssemblyExports, getConfig } = await dotnet.create();
const managed = (await getAssemblyExports(getConfig().mainAssemblyName)).Pakop.PakopInterop;

export function list(data) {
  return managed.List(data);
}

export function list_hash(data, ignore_uexp) {
  return JSON.parse(managed.ListHash(data, ignore_uexp));
}

export function get_datatables_names(pak_data, raw_path, mapping_data) {
  return managed.GetDatatablesNames(pak_data, raw_path, mapping_data);
}

export function print_exports(pak_data, raw_path, mapping_data) {
  managed.PrintExports(pak_data, raw_path, mapping_data);
}
