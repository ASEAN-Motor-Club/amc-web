export interface FileEntry {
  raw_path: string;
  path: string;
  hash: string;
}

/**
 * List all file paths inside a .pak file.
 *
 * @throws {Error} if the pak data is invalid or cannot be parsed.
 */
export function list(data: Uint8Array): string[];

/**
 * List all file paths and their SHA-256 hashes inside a .pak file.
 *
 * @throws {Error} if the pak data is invalid or cannot be parsed.
 */
export function list_hash(data: Uint8Array, ignore_uexp: boolean): FileEntry[];

/**
 * Return the row names of the first DataTable export in a .uasset.
 *
 * @throws {Error} if the pak or asset data is invalid, or if no DataTable export is found.
 */
export function get_datatables_names(
  pak_data: Uint8Array,
  raw_path: string,
  mapping_data: Uint8Array,
): string[];

/**
 * Log all exports of a .uasset to the console (dev helper).
 *
 * @throws {Error} if the pak or asset data is invalid or cannot be parsed.
 */
export function print_exports(
  pak_data: Uint8Array,
  raw_path: string,
  mapping_data: Uint8Array,
): void;
