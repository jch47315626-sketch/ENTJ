/**
 * 픽셀 이펙트: our own pixel-art effects (tools/pixelfx/fx/, drawn with pixelfx's
 * core, https://github.com/patch-gg/pixelfx). They are drawn top-down like the
 * field: the floor is undistorted and height goes up the screen, so each
 * effect's floor circle is a true circle.
 *
 * Two ways to play one:
 * - Baked (most): sprite strips made by tools/pixelfx/bake.mjs. A g.fx entry
 *   { type: 'pfx', key, x, y, scale, angle?, follow?, t, life } plays one;
 *   `pixelFx()` builds it. Directional sheets face right and turn by `angle`.
 * - Live: effects whose shape is only known in play (lightning between foes, a
 *   chain to a hooked soldier) are drawn each frame with pixelfx's painter
 *   (render/livePixel.js).
 */
import { PIXEL_FX_SHEETS } from '../data/pixelFxSheets.js';
import { drawPicture } from './pixelUnit.js';

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
 * (world units), the effect's floor circle (or reach) is scaled to exactly
 * that radius, so it lines up with the hit area; without it, it plays at its
 * own size. `extra` may set angle (radians), follow (a unit), life, alpha.
 */
export function pixelFx(key, x, y, radius, extra) {
  const s = PIXEL_FX_SHEETS[key];
  const scale = radius && s?.r ? radius / s.r : 1;
  return { type: 'pfx', key, x, y, scale, t: 0, life: s ? s.frames / s.fps : 0, ...extra };
}

/**
 * A weapon swing (hitArc's style, arc and reach) as a pixel sheet turned to the
 * aim, its rim on the exact reach. Sheets are baked per weapon level at the
 * level's arc; null when there's none for this swing (the vector one stays).
 */
export function arcFx(style, x, y, angle, range, arcDeg) {
  const key = {
    kingSlash: `kingSlash${arcDeg}`,
    royal: arcDeg >= 360 ? 'royalSpin' : null,
    chop: `chop${arcDeg}`,
    paewang: `paewang${arcDeg}`,
    slash: arcDeg === 120 ? 'allySlash' : null,
  }[style];
  return key && PIXEL_FX_SHEETS[key] ? pixelFx(key, x, y, range, { angle }) : null;
}

/** True when a sheet exists (and so pixelFx(key) will draw something). */
export const hasPixelFx = (key) => !!PIXEL_FX_SHEETS[key];

/** Draws one frame of sheet `key` with its pivot at (x, y). */
export function drawSheet(ctx, key, frame, x, y, scale = 1, angle = 0, alpha = 1) {
  const s = PIXEL_FX_SHEETS[key];
  const img = images[key];
  if (!s || !img || !img.complete || !img.naturalWidth) return false;
  const i = s.loop ? ((frame % s.frames) + s.frames) % s.frames : Math.max(0, Math.min(s.frames - 1, frame));
  const sx = (i % s.cols) * s.w, sy = Math.floor(i / s.cols) * s.h;
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (alpha < 1) ctx.globalAlpha *= Math.max(0, alpha);
  ctx.translate(x, y);
  if (angle) ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.drawImage(img, sx, sy, s.w, s.h, -s.pivot[0], -s.pivot[1], s.w, s.h);
  ctx.restore();
  return true;
}

/** Draws a 'pfx' entry in world space. */
export function drawPixelFx(ctx, f) {
  const s = PIXEL_FX_SHEETS[f.key];
  // Nothing before its start, nothing over a foe that has fallen.
  if (!s || f.t < 0 || f.follow?.dead) return;
  const x = f.follow ? f.follow.x + (f.dx ?? 0) : f.x, y = f.follow ? f.follow.y + (f.dy ?? 0) : f.y;
  let alpha = f.alpha ?? 1;
  // A looping sheet held for a set life fades out over its last moments.
  if (s.loop && f.fadeOut) alpha *= Math.min(1, (f.life - f.t) / f.fadeOut);
  drawSheet(ctx, f.key, Math.floor(f.t * s.fps), x, y, f.scale, f.angle ?? 0, alpha);
}

/**
 * Projectiles drawn from looping sheets: kind → (sheet, radius the sheet's `r`
 * should match). Returns false when the kind has no sheet (the vector drawing stays).
 */
const PROJECTILES = {
  orb: (p) => ['orb', p.r],
  beam: (p) => ['beam', p.r],
  wave: (p) => ['swordWave', p.r],
  redSlash: (p) => [p.big ? 'redWaveBig' : 'redWave', p.span],
  boulder: (p) => [p.r > 30 ? 'boulderBig' : 'boulder', p.r],
  arrow: (p) => (p.team === 'player' ? ['arrow', 10] : null),
};

/** Enemy projectiles drawn from pictures (game/assets/units/projectile_*.png): kind → [picture, length]. */
const PICTURES = {
  arrow: (p) => (p.team !== 'player' ? ['projectile_arrow', 26] : null),
  hook: () => ['projectile_hook', 36],
};

export function drawProjectileFx(ctx, p, time) {
  const pic = PICTURES[p.kind]?.(p);
  if (pic && drawPicture(ctx, pic[0], p.x, p.y, pic[1], p.angle ?? Math.atan2(p.vy, p.vx))) return true;
  const pick = PROJECTILES[p.kind]?.(p);
  if (!pick) return false;
  const [key, radius] = pick;
  const s = PIXEL_FX_SHEETS[key];
  if (!s) return false;
  const scale = radius && s.r ? radius / s.r : 1;
  // Each projectile runs its own phase so a volley doesn't flicker in step.
  const phase = (p.seed ??= Math.random()) * s.frames;
  const alpha = p.kind === 'redSlash' || p.kind === 'wave' ? Math.min(1, p.life * 4) : 1;
  return drawSheet(ctx, key, Math.floor(time * s.fps + phase), p.x, p.y, scale, p.angle ?? 0, alpha);
}
