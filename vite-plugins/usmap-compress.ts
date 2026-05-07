import { brotliCompressSync, gzipSync, constants as zlibConstants } from 'zlib';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import type { Plugin } from 'vite';

export type UsmapEncoding = 'gzip' | 'br';

export interface UsmapCompressOptions {
  /**
   * Compression encoding to use.
   * 'br' (brotli) gives better compression, 'gzip' is more broadly supported.
   * @default 'br'
   */
  encoding?: UsmapEncoding;
}

/**
 * Vite plugin that pre-compresses .usmap assets and generates a Cloudflare Pages
 * `_headers` file with the matching `Content-Encoding` header, tricking Cloudflare
 * into serving already-compressed data without double-compressing it.
 *
 * The browser transparently decompresses the response before the JS `fetch()` resolves,
 * so no client-side code changes are needed.
 */
export function usmapCompressPlugin(options: UsmapCompressOptions = {}): Plugin {
  const encoding = options.encoding ?? 'br';
  const emittedPaths: string[] = [];

  return {
    name: 'usmap-compress',
    apply: 'build',

    generateBundle(_outputOptions, bundle) {
      for (const [fileName, chunk] of Object.entries(bundle)) {
        if (!fileName.endsWith('.usmap')) continue;
        if (chunk.type !== 'asset') continue;

        const source = chunk.source;
        const buf = Buffer.isBuffer(source) ? source : Buffer.from(source as string);

        let compressed: Buffer;
        if (encoding === 'br') {
          compressed = brotliCompressSync(buf, {
            params: {
              [zlibConstants.BROTLI_PARAM_QUALITY]: zlibConstants.BROTLI_MAX_QUALITY,
            },
          });
        } else {
          compressed = gzipSync(buf, { level: 9 });
        }

        const ratio = ((1 - compressed.byteLength / buf.byteLength) * 100).toFixed(1);
        console.log(
          `[usmap-compress] ${fileName}: ${(buf.byteLength / 1024).toFixed(0)} KB → ${(compressed.byteLength / 1024).toFixed(0)} KB (${ratio}% smaller, ${encoding})`,
        );

        chunk.source = compressed;
        emittedPaths.push(fileName);
      }
    },

    closeBundle() {
      if (emittedPaths.length === 0) return;

      // Write _headers to static/ so the SvelteKit static adapter copies it to build/
      const headersPath = resolve(process.cwd(), 'static/_headers');
      const contentEncoding = encoding === 'br' ? 'br' : 'gzip';

      // Collect unique wildcard patterns from emitted paths
      // e.g. "_app/immutable/assets/Mappings718.DBIEBJgM.usmap" → "/_app/immutable/assets/*.usmap"
      const patterns = new Set(
        emittedPaths.map((p) => '/' + p.replace(/\/[^/]+\.usmap$/, '/*.usmap')),
      );

      let existing = '';
      try {
        existing = readFileSync(headersPath, 'utf-8');
      } catch {
        // file doesn't exist yet
      }

      const newEntries = [...patterns]
        .filter((pattern) => !existing.includes(pattern))
        .map((pattern) => `${pattern}\n  Content-Encoding: ${contentEncoding}`)
        .join('\n');

      if (newEntries) {
        const content = existing ? `${existing.trimEnd()}\n\n${newEntries}\n` : `${newEntries}\n`;
        writeFileSync(headersPath, content);
        console.log(
          `[usmap-compress] Wrote Content-Encoding: ${contentEncoding} to static/_headers`,
        );
      }
    },
  };
}
