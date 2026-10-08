import { TILE, rocksNear, tileBog } from '../systems/terrain.js';
import { TAU } from '../core/math.js';

/** Bogs (under everything) for the visible part of a field with stage.terrain. */
export function drawBogs(ctx, g, v) {
  const T = g.stage.terrain;
  if (!T?.bog) return;
  const tx0 = Math.floor(v.x0 / TILE) - 1, tx1 = Math.floor(v.x1 / TILE) + 1;
  const ty0 = Math.floor(v.y0 / TILE) - 1, ty1 = Math.floor(v.y1 / TILE) + 1;
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) {
    const b = tileBog(T, tx, ty);
    if (!b) continue;
    ctx.fillStyle = 'rgba(48, 58, 34, 0.85)';
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120, 140, 80, 0.55)';
    ctx.lineWidth = 3;
    ctx.stroke();
    // Slow ripples and a few reeds.
    const k = (((g.time * 0.4 + b.x * 0.01) % 1) + 1) % 1;
    ctx.strokeStyle = `rgba(170, 190, 130, ${0.35 * (1 - k)})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.rx * (0.3 + 0.6 * k), b.ry * (0.3 + 0.6 * k), 0, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(90, 110, 60, 0.9)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const rx = b.x - b.rx * 0.8 + i * b.rx * 0.5, ry = b.y - b.ry * 0.6 + (i % 2) * b.ry;
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(rx + 3, ry - 14);
      ctx.stroke();
    }
  }
}

/** Boulders (fixed and fallen) in view. */
export function drawRocks(ctx, g, v) {
  if (!g.stage.terrain) return;
  const cx = (v.x0 + v.x1) / 2, cy = (v.y0 + v.y1) / 2;
  const R = Math.hypot(v.x1 - v.x0, v.y1 - v.y0) / 2;
  for (const r of rocksNear(g, cx, cy, R)) {
    if (r.x + r.r < v.x0 || r.x - r.r > v.x1 || r.y + r.r < v.y0 || r.y - r.r > v.y1) continue;
    const fade = r.until ? Math.min(1, (r.until - g.time) / 1.2) : 1;
    ctx.globalAlpha = fade;
    // Shadow, body, light face, cracks.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(r.x + 6, r.y + r.r * 0.55, r.r * 1.05, r.r * 0.45, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = r.fallen ? '#6e655a' : '#5d5a55';
    ctx.strokeStyle = '#26231f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const k = 0.85 + 0.15 * Math.sin(a * 3 + r.seed * 9);
      const x = r.x + Math.cos(a) * r.r * k, y = r.y + Math.sin(a) * r.r * k * 0.92;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(200, 196, 184, 0.35)';
    ctx.beginPath();
    ctx.ellipse(r.x - r.r * 0.28, r.y - r.r * 0.32, r.r * 0.45, r.r * 0.28, -0.4, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(30, 28, 24, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(r.x + r.r * 0.1, r.y - r.r * 0.5);
    ctx.lineTo(r.x - r.r * 0.05, r.y);
    ctx.lineTo(r.x + r.r * 0.25, r.y + r.r * 0.35);
    ctx.stroke();
    if (!r.fallen && r.seed > 0.55) {
      // Moss on the older stones.
      ctx.fillStyle = 'rgba(96, 124, 64, 0.6)';
      ctx.beginPath();
      ctx.ellipse(r.x + r.r * 0.3, r.y - r.r * 0.55, r.r * 0.35, r.r * 0.14, 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
