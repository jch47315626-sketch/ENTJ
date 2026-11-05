/**
 * Live effects: shapes only known in play (lightning jumping between foes,
 * the chain to a hooked soldier, a curse passing on), drawn each frame.
 *
 * They used to be painted pixel by pixel into an off-screen buffer and
 * uploaded with putImageData every frame. That stalled phones badly (a curse
 * link across the screen meant a buffer the size of the screen, every frame),
 * so they are now drawn straight onto the field with a few hard-edged strokes
 * on whole pixels, in the same colours, which keeps the pixel look.
 */
import { Rng } from '../vendor/pixelfx/math.js';

/** A jagged path from a to b that wanders `amp` either side. */
function jag(R, ax, ay, bx, by, amp, step = 9) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const n = Math.max(2, Math.round(L / step)), pts = [[ax, ay]];
  for (let i = 1; i < n; i++) {
    const u = i / n, off = R.range(-amp, amp) * Math.sin(Math.PI * u);
    pts.push([Math.round(ax + dx * u + nx * off), Math.round(ay + dy * u + ny * off)]);
  }
  pts.push([bx, by]);
  return pts;
}

function stroke(ctx, pts, color, width, alpha = 1) {
  if (alpha <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.stroke();
}

function begin(ctx) {
  ctx.save();
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
}

/**
 * 금강저 lightning: a bolt through `points` ({x, y}, the first may be in the sky),
 * flickering into a new shape every few hundredths, with forks and hot nodes
 * where it strikes. u: 0..1 through its life.
 */
export function drawLightning(ctx, f, u) {
  const pts = f.points;
  if (!pts || pts.length < 2) return;
  const R = new Rng(Math.floor((f.seed ?? 0.5) * 1e6) + Math.floor(f.t * 30) * 7919);
  const k = u < 0.15 ? 1 : 1 - (u - 0.15) / 0.85;
  begin(ctx);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const path = jag(R, a.x, a.y, b.x, b.y, Math.min(14, Math.hypot(b.x - a.x, b.y - a.y) * 0.12));
    // Glow, a blue body, a white core.
    stroke(ctx, path, '#9ac8ff', 7, 0.25 * k);
    stroke(ctx, path, '#5a7ae8', 3, k > 0.3 ? 1 : k / 0.3);
    stroke(ctx, path, k > 0.5 ? '#ffffff' : '#e0f2ff', 1.5, 1);
    // Two short forks off the middle.
    for (let n = 0; n < 2; n++) {
      const m = path[1 + Math.floor(R.next() * (path.length - 2))];
      if (!m) continue;
      const g = R.range(0, Math.PI * 2), L = R.range(8, 18);
      stroke(ctx, jag(R, m[0], m[1], m[0] + Math.cos(g) * L, m[1] + Math.sin(g) * L, 3, 5), '#9ac8ff', 1.5, k);
    }
    // Struck point: a hot knot and a ring on the floor.
    if (u < 0.5) {
      ctx.globalAlpha = 0.7 * (1 - u * 2);
      ctx.fillStyle = '#e0f2ff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3 + 4 * (1 - u), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1 - u * 2;
      ctx.strokeStyle = '#9ac8ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(b.x, b.y, 6 + u * 14, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/**
 * 철쇄: an iron chain from 견훤 (a) to the hooked soldier (b): links turning
 * flat and edge-on in turn, a hook at the soldier's end.
 */
export function drawChain(ctx, ax, ay, bx, by, time) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  // Slack: the chain sags a little and shivers as it hauls.
  const sag = Math.min(10, L * 0.05) * (0.6 + 0.4 * Math.sin(time * 30));
  const at = (s) => [Math.round(ax + ux * s + nx * Math.sin(Math.PI * s / L) * sag), Math.round(ay + uy * s + ny * Math.sin(Math.PI * s / L) * sag)];
  begin(ctx);
  const LINK = 6, flat = [], edge = [];
  for (let s = 4, i = 0; s < L - 4; s += LINK, i++) (i % 2 ? edge : flat).push([at(s), at(Math.min(L, s + LINK))]);
  const seg = (list, color, w, off = 0) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    for (const [[x, y], [x2, y2]] of list) {
      ctx.moveTo(x + nx * off, y + ny * off);
      ctx.lineTo(x2 + nx * off, y2 + ny * off);
    }
    ctx.stroke();
  };
  seg(flat, '#1d1a17', 4);
  seg(flat, '#8a8d94', 1, -1);
  seg(flat, '#c8ccd2', 1, 1);
  seg(edge, '#4a4c52', 3);
  seg(edge, '#8a8d94', 1);
  // The hook biting into the soldier.
  const a = Math.atan2(uy, ux);
  ctx.strokeStyle = '#8a8d94';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bx, by, 5, a + 1.2, a + 4.6);
  ctx.stroke();
  ctx.restore();
}

/** 애꾸눈의 저주 passing on: a violet thread snaking from the fallen to the next foe. */
export function drawCurseLink(ctx, f, u) {
  const R = new Rng(Math.floor((f.seed ?? 0.5) * 1e6));
  const reach = Math.min(1, u / 0.5), k = 1 - Math.max(0, (u - 0.5) / 0.5);
  const bx = f.x + (f.tx - f.x) * reach, by = f.y + (f.ty - f.y) * reach;
  const path = jag(R, f.x, f.y - 10, bx, by - 10, 6, 7);
  begin(ctx);
  stroke(ctx, path, '#c860e0', 5, 0.25 * k);
  stroke(ctx, path, '#8a2ea0', 2.5, k);
  stroke(ctx, path, '#f0b8ff', 1, k);
  ctx.globalAlpha = k;
  ctx.fillStyle = '#f0b8ff';
  ctx.fillRect(Math.round(bx) - 2, Math.round(by - 10) - 2, 4, 4);
  ctx.restore();
}
