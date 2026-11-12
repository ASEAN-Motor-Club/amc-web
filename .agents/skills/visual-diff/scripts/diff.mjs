// Shared pixel-diff helper for golden.mjs: two PNGs in, a mismatch score + a diff PNG out.
// The maths runs inside a Playwright page (canvas ImageData), so there are no image dependencies.

export const dataUrl = (buf) => `data:image/png;base64,${buf.toString('base64')}`;

/**
 * Compares two same-size screenshots. A pixel of A matches when some pixel of B within `radius` px has
 * every channel within `tolerance`. Returns the share of mismatching pixels (`score`) and a diff PNG data URL
 * (red = no match, otherwise B dimmed).
 */
export async function compareInPage(page, { shots, radius, tolerance }) {
  return page.evaluate(
    async ({ shots, radius, tolerance }) => {
      const load = (src) =>
        new Promise((res, rej) => {
          const img = new Image();
          img.onload = () => res(img);
          img.onerror = rej;
          img.src = src;
        });
      const [ia, ib] = await Promise.all(shots.map(load));
      const w = ia.width;
      const h = ia.height;
      const read = (img) => {
        const c = new OffscreenCanvas(w, h);
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, w, h).data;
      };
      const a = read(ia);
      const b = read(ib);
      const out = new ImageData(w, h);
      let mismatch = 0;
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const j = (y * w + x) * 4;
          let matched = false;
          for (let dy = -radius; dy <= radius && !matched; dy++) {
            for (let dx = -radius; dx <= radius && !matched; dx++) {
              const xx = x + dx;
              const yy = y + dy;
              if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
              const k = (yy * w + xx) * 4;
              matched =
                Math.abs(a[j] - b[k]) <= tolerance &&
                Math.abs(a[j + 1] - b[k + 1]) <= tolerance &&
                Math.abs(a[j + 2] - b[k + 2]) <= tolerance;
            }
          }
          out.data[j + 3] = 255;
          if (matched) {
            out.data[j] = b[j] >> 2;
            out.data[j + 1] = b[j + 1] >> 2;
            out.data[j + 2] = b[j + 2] >> 2;
          } else {
            mismatch++;
            out.data[j] = 255;
          }
        }
      }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').putImageData(out, 0, 0);
      return { score: mismatch / (w * h), diff: c.toDataURL('image/png') };
    },
    { shots, radius, tolerance },
  );
}
