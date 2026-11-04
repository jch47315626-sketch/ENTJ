/**
 * 영물 icons for the menus: the same pixel creature as on the field
 * (render/pixelBeast.js), drawn once, cropped to what it covers and kept as a
 * small image. spiritIcon(id) gives the HTML for one (an <img>), sized by CSS
 * (.px-ic, 1em by default so it sits where the emoji used to).
 */
import { drawPixelBeast, isFlyer, spriteUrl } from './pixelBeast.js';

const urls = new Map();

/** A data URL of 영물 `id` (or a 사신 guardian id), or null if it has no pixel creature. */
export function spiritIconUrl(id) {
  // A drawn sprite is its own icon.
  const drawn = spriteUrl(id);
  if (drawn) return drawn;
  if (urls.has(id)) return urls.get(id);
  const size = 96;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  // Flyers hover: put their ground spot lower so the body lands mid-canvas.
  const ok = drawPixelBeast(ctx, id, size / 2, size * (isFlyer(id) ? 0.95 : 0.7), 12, false, 0);
  let url = null;
  if (ok) {
    // Crop to the pixels it covers (dropping the faint shadow), square, with a pixel of margin.
    const d = ctx.getImageData(0, 0, size, size).data;
    let x0 = size, y0 = size, x1 = -1, y1 = -1;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++)
        if (d[(y * size + x) * 4 + 3] > 160) {
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
    if (x1 >= 0) {
      const s = Math.max(x1 - x0, y1 - y0) + 3;
      const out = document.createElement('canvas');
      out.width = out.height = s;
      out.getContext('2d').drawImage(cv, x0 - Math.floor((s - (x1 - x0)) / 2), y0 - Math.floor((s - (y1 - y0)) / 2), s, s, 0, 0, s, s);
      url = out.toDataURL();
    }
  }
  urls.set(id, url);
  return url;
}

/** HTML for a 영물's icon; falls back to `fallback` (its emoji) when there is no pixel creature. */
export function spiritIcon(id, fallback = '', cls = '') {
  const url = spiritIconUrl(id);
  return url ? `<img class="px-ic${cls ? ` ${cls}` : ''}" src="${url}" alt="" draggable="false">` : fallback;
}
