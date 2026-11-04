/**
 * Live pixel effects: shapes only known in play (lightning jumping between
 * foes, the chain to a hooked soldier, a curse passing on) drawn each frame
 * with pixelfx's painter, 1 pixel = 1 world unit, then put on the field.
 */
import { createFrame, clearFrame, composite, painterFor } from '../vendor/pixelfx/fx.js';
import { hex, fit } from '../vendor/pixelfx/color.js';
import { Rng } from '../vendor/pixelfx/math.js';

const frames = new Map();
let canvas = null, cctx = null;

/** Runs `paint(painter)` over the world box [x0, x1] × [y0, y1] and draws the result. */
function live(ctx, x0, y0, x1, y1, paint) {
  x0 = Math.floor(x0); y0 = Math.floor(y0);
  const w = Math.min(1600, Math.ceil(x1) - x0 + 1), h = Math.min(1600, Math.ceil(y1) - y0 + 1);
  if (w <= 0 || h <= 0) return;
  // Frames are reused by size bucket so nothing is allocated every frame.
  const bw = Math.ceil(w / 32) * 32, bh = Math.ceil(h / 32) * 32, key = `${bw}x${bh}`;
  let f = frames.get(key);
  if (!f) {
    f = { frame: createFrame(bw, bh), img: new ImageData(bw, bh) };
    frames.set(key, f);
  }
  const fr = f.frame;
  fr.ox = x0;
  fr.oy = y0;
  clearFrame(fr);
  const p = painterFor(fr);
  p.place(0, 0);
  paint(p);
  composite(fr, f.img.data, null);
  if (!canvas) {
    canvas = document.createElement('canvas');
    cctx = canvas.getContext('2d');
  }
  if (canvas.width < bw || canvas.height < bh) {
    canvas.width = Math.max(canvas.width, bw);
    canvas.height = Math.max(canvas.height, bh);
  }
  cctx.clearRect(0, 0, bw, bh);
  cctx.putImageData(f.img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, 0, 0, bw, bh, x0, y0, bw, bh);
  ctx.restore();
}

const box = (pts, pad) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of pts) {
    x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y);
  }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
};

/** A jagged path from a to b that wanders `amp` either side. */
function jag(R, ax, ay, bx, by, amp, step = 9) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const n = Math.max(2, Math.round(L / step)), pts = [[ax, ay]];
  for (let i = 1; i < n; i++) {
    const u = i / n, off = R.range(-amp, amp) * Math.sin(Math.PI * u);
    pts.push([ax + dx * u + nx * off, ay + dy * u + ny * off]);
  }
  pts.push([bx, by]);
  return pts;
}

const VOLT = fit(['#1a1440', '#3a3aa0', '#5a7ae8', '#9ac8ff', '#e0f2ff', '#ffffff'], 6);
const GOLDV = fit(['#3a2408', '#a87418', '#ffd84a', '#fff09a', '#ffffff'], 5);

/**
 * 금강저 lightning: a bolt through `points` ({x, y}, the first may be in the sky),
 * flickering into a new shape every few hundredths, with forks and hot nodes
 * where it strikes. u: 0..1 through its life.
 */
export function drawLightning(ctx, f, u) {
  const pts = f.points;
  if (!pts || pts.length < 2) return;
  const [x0, y0, x1, y1] = box(pts, 40);
  const R = new Rng(Math.floor((f.seed ?? 0.5) * 1e6) + Math.floor(f.t * 30) * 7919);
  const k = u < 0.15 ? 1 : 1 - (u - 0.15) / 0.85;
  live(ctx, x0, y0, x1, y1, (p) => {
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const path = jag(R, a.x, a.y, b.x, b.y, Math.min(14, Math.hypot(b.x - a.x, b.y - a.y) * 0.12));
      // Glow, a thick blue body, a white core.
      for (let j = 1; j < path.length; j++) p.glowLine(path[j - 1][0], path[j - 1][1], path[j][0], path[j][1], 10, VOLT[3], 0.35 * k);
      for (let j = 1; j < path.length; j++) {
        const [px, py] = path[j - 1], [qx, qy] = path[j];
        p.line(px + 1, py, qx + 1, qy, VOLT[2], k > 0.3 ? 1 : k / 0.3);
        p.line(px, py, qx, qy, k > 0.5 ? VOLT[5] : VOLT[4], 1);
      }
      // Two short forks off the middle.
      for (let n = 0; n < 2; n++) {
        const m = path[1 + Math.floor(R.next() * (path.length - 2))];
        if (!m) continue;
        const g = R.range(0, Math.PI * 2), L = R.range(8, 18);
        p.polyline(jag(R, m[0], m[1], m[0] + Math.cos(g) * L, m[1] + Math.sin(g) * L, 3, 5), VOLT[3], k);
      }
      // Struck point: a hot knot and a ring on the floor.
      if (u < 0.5) {
        p.circle(b.x, b.y, 3 * (1 - u), VOLT[5]);
        p.glow(b.x, b.y, 18, VOLT[4], 0.7 * (1 - u * 2));
        p.ring(b.x, b.y, 6 + u * 14, 1, VOLT[3], 1 - u * 2);
      }
    }
  });
}

/**
 * 철쇄: an iron chain from 견훤 (a) to the hooked soldier (b): oval links
 * turning edge-on and flat in turn, lit on top, a hook at the soldier's end.
 */
export function drawChain(ctx, ax, ay, bx, by, time) {
  const IRON = ['#1d1a17', '#4a4c52', '#8a8d94', '#c8ccd2'].map(hex);
  live(ctx, Math.min(ax, bx) - 8, Math.min(ay, by) - 8, Math.max(ax, bx) + 8, Math.max(ay, by) + 8, (p) => {
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    // Slack: the chain sags a little and shivers as it hauls.
    const sag = Math.min(10, L * 0.05) * (0.6 + 0.4 * Math.sin(time * 30));
    const at = (s) => [ax + ux * s + nx * Math.sin(Math.PI * s / L) * sag, ay + uy * s + ny * Math.sin(Math.PI * s / L) * sag];
    const LINK = 6;
    for (let s = 4, i = 0; s < L - 4; s += LINK, i++) {
      const [x, y] = at(s), [x2, y2] = at(Math.min(L, s + LINK));
      if (i % 2 === 0) {
        // Flat link: an outlined oval along the chain.
        p.line(x, y, x2, y2, IRON[0]);
        p.line(x + nx * 1.5, y + ny * 1.5, x2 + nx * 1.5, y2 + ny * 1.5, IRON[3]);
        p.line(x - nx * 1.5, y - ny * 1.5, x2 - nx * 1.5, y2 - ny * 1.5, IRON[1]);
      } else {
        // Edge-on link: a short bright bar.
        p.line(x, y, x2, y2, IRON[2]);
        p.px(x, y, IRON[0]);
      }
    }
    // The hook biting into the soldier.
    p.arc(bx, by, 5, 2, Math.atan2(uy, ux) + 1.2, Math.atan2(uy, ux) + 4.6, IRON[2]);
    p.px(bx - ux * 4, by - uy * 4 - 1, IRON[3]);
  });
}

/** 애꾸눈의 저주 passing on: a violet thread snaking from the fallen to the next foe. */
export function drawCurseLink(ctx, f, u) {
  const C = fit(['#1a0a22', '#4e1a5e', '#8a2ea0', '#c860e0', '#f0b8ff'], 5);
  const R = new Rng(Math.floor((f.seed ?? 0.5) * 1e6));
  const reach = Math.min(1, u / 0.5), k = 1 - Math.max(0, (u - 0.5) / 0.5);
  const bx = f.x + (f.tx - f.x) * reach, by = f.y + (f.ty - f.y) * reach;
  live(ctx, Math.min(f.x, f.tx) - 16, Math.min(f.y, f.ty) - 16, Math.max(f.x, f.tx) + 16, Math.max(f.y, f.ty) + 16, (p) => {
    const path = jag(R, f.x, f.y - 10, bx, by - 10, 6, 7);
    for (let j = 1; j < path.length; j++) {
      p.glowLine(path[j - 1][0], path[j - 1][1], path[j][0], path[j][1], 6, C[3], 0.3 * k);
      p.line(path[j - 1][0], path[j - 1][1], path[j][0], path[j][1], (v) => C[2 + Math.round(v * 2)], k);
    }
    p.circle(bx, by - 10, 2, C[4], k);
  });
}

export { GOLDV };
