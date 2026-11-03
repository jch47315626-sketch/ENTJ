/**
 * 픽셀 이펙트: our own pixel-art effects (tools/pixelfx/fx/, drawn with pixelfx's
 * core, https://github.com/patch-gg/pixelfx), baked into sprite strips by
 * tools/pixelfx/bake.mjs. They are drawn top-down like the field: the floor is
 * undistorted and height goes up the screen, so each effect's floor circle is a
 * true circle. A g.fx entry { type: 'pfx', key, x, y, scale, t, life } plays
 * one; `pixelFx()` builds it.
 */
import { PIXEL_FX_SHEETS } from '../data/pixelFxSheets.js';

const images = {};

/** Starts loading every sheet (call once at boot; drawing skips sheets not loaded yet). */
export function preloadPixelFx() {
  for (const [key, s] of Object.entries(PIXEL_FX_SHEETS)) {
    if (images[key]) continue;
    const img = new Image();
    img.decoding = 'async';
    img.src = `assets/fx/${s.file}`;
    images[key] = img;
  }
}

/**
 * A g.fx entry that plays sheet `key` once centred on (x, y). Given `radius`
 * (world units), the effect's floor circle is scaled to exactly that radius,
 * so it lines up with the hit area; without it, it plays at its own size.
 */
export function pixelFx(key, x, y, radius, extra) {
  const s = PIXEL_FX_SHEETS[key];
  const scale = radius && s?.r ? radius / s.r : 1;
  return { type: 'pfx', key, x, y, scale, t: 0, life: s ? s.frames / s.fps : 0, ...extra };
}

/** Draws a 'pfx' entry in world space. */
export function drawPixelFx(ctx, f) {
  const s = PIXEL_FX_SHEETS[f.key];
  const img = images[f.key];
  if (!s || !img || !img.complete || !img.naturalWidth) return;
  const i = Math.min(s.frames - 1, Math.floor(f.t * s.fps));
  const sx = (i % s.cols) * s.w, sy = Math.floor(i / s.cols) * s.h;
  const k = f.scale;
  const x = f.follow ? f.follow.x : f.x, y = f.follow ? f.follow.y : f.y;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (f.alpha !== undefined) ctx.globalAlpha = f.alpha;
  ctx.drawImage(img, sx, sy, s.w, s.h, x - s.pivot[0] * k, y - s.pivot[1] * k, s.w * k, s.h * k);
  ctx.restore();
}
