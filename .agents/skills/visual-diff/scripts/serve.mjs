// Usage: node serve.mjs <buildDir> <port>
// Static server with SvelteKit's SPA fallback, mirroring production hosting.
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve } from 'node:path';

const [dirArg = 'build', portArg = '4174'] = process.argv.slice(2);
const dir = resolve(dirArg);
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.avif': 'image/avif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.mp4': 'video/mp4',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const candidate of [
    pathname,
    `${pathname}.html`,
    join(pathname, 'index.html'),
    '/fallback.html',
  ]) {
    const file = join(dir, candidate);
    if (file.startsWith(dir) && existsSync(file) && statSync(file).isFile()) {
      res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
      createReadStream(file).pipe(res);
      return;
    }
  }
  res.writeHead(404).end();
}).listen(Number(portArg), () => console.log(`serving ${dir} on http://localhost:${portArg}`));
