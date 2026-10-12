import { SPIRIT_GRADES } from '../data/spirits.js';

/**
 * 영물 on the field: each companion is its emoji in a small glowing orb of
 * its grade's colour (bobbing, and darting out when it acts), plus what
 * some of them leave around: 삼족오's beams, 늑대 무리, 백상 under the hero,
 * the shell 바다거북/현무 put on the hero, and the effect types they push
 * (spRing, spLine).
 */
const TAU = Math.PI * 2;

function orb(ctx, x, y, icon, color, size, t) {
  const glow = ctx.createRadialGradient(x, y, 2, x, y, size * 1.25);
  glow.addColorStop(0, `${color}aa`);
  glow.addColorStop(1, `${color}00`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, size * 1.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(20, 16, 24, 0.55)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.72, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.font = `${Math.round(size)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x, y + size * 0.06 + Math.sin(t * 6) * 0.6);
}

/** Where a spirit is drawn: its follow spot, pulled toward a lunge target and back. */
function spot(s) {
  if (!s.lunge) return { x: s.x, y: s.y };
  const L = s.lunge;
  const u = L.t < L.dur ? L.t / L.dur : 1 - (L.t - L.dur) / L.dur;
  const k = Math.max(0, Math.min(1, u));
  return { x: s.x + (L.x - s.x) * k, y: s.y + (L.y - s.y) * k };
}

/** Under the units: 백상 carrying the hero, 삼족오 beams. */
export function drawSpiritsUnder(ctx, g) {
  const p = g.player;
  for (const s of g.spirits ?? []) {
    if (s.id === 'elephant' && s.data.until > g.time) {
      orb(ctx, p.x, p.y + 10, '🐘', '#f1e8d2', 40, g.time);
    }
    if (s.id === 'samjogo' && s.data.beams) {
      for (let i = 0; i < s.data.beams; i++) {
        const a = s.data.angle + (i * TAU) / s.data.beams;
        const ex = p.x + Math.cos(a) * 210, ey = p.y + Math.sin(a) * 210;
        const grd = ctx.createLinearGradient(p.x, p.y, ex, ey);
        grd.addColorStop(0, 'rgba(255, 220, 120, 0.85)');
        grd.addColorStop(1, 'rgba(255, 140, 40, 0.1)');
        ctx.strokeStyle = grd;
        ctx.lineCap = 'round';
        ctx.lineWidth = 16 + Math.sin(g.time * 20 + i) * 3;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(255, 250, 220, 0.9)';
        ctx.lineWidth = 4;
        ctx.stroke();
      }
    }
  }
}

/** One companion (called in the y-sorted unit pass). */
export function drawSpirit(ctx, g, s) {
  const { x, y } = spot(s);
  const color = SPIRIT_GRADES[s.def.grade].color;
  const grow = s.id === 'cub' ? 0.8 + 0.8 * (s.data.grow ?? 0) : 1;
  orb(ctx, x, y - 14, s.id === 'cub' && (s.data.grow ?? 0) >= 1 ? '🐅' : s.def.icon, color, 25 * grow, g.time + s.slot);
  if (s.id === 'wolf') for (const w of s.data.pack ?? []) orb(ctx, w.x, w.y - 8, '🐺', '#c9d0e0', w.bite > 0 ? 18 : 14, g.time + w.x * 0.01);
  for (const w of s.data.pack ?? []) if (w.bite > 0) w.bite -= 1 / 60;
}

/** The shell on the hero while a shield holds. */
export function drawSpiritShield(ctx, g) {
  const p = g.player;
  if (!(p.shield > 0)) return;
  const k = Math.min(1, p.shield / (p.shieldMax || p.shield));
  ctx.strokeStyle = `rgba(140, 220, 255, ${0.35 + 0.45 * k})`;
  ctx.fillStyle = `rgba(140, 220, 255, ${0.08 + 0.1 * k})`;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + g.time * 0.5;
    ctx.lineTo(p.x + Math.cos(a) * 30, p.y - 10 + Math.sin(a) * 30);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** Zones only 영물 make. Returns true if drawn. */
export function drawSpiritZone(ctx, g, z, a) {
  if (z.kind === 'water') {
    ctx.fillStyle = `rgba(90, 170, 230, ${0.22 * a})`;
    ctx.strokeStyle = `rgba(160, 220, 255, ${0.5 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r * (0.9 + 0.1 * Math.sin(g.time * 4)), 0, TAU);
    ctx.fill();
    ctx.stroke();
    return true;
  }
  if (z.kind === 'storm') {
    ctx.fillStyle = 'rgba(120, 200, 230, 0.12)';
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 245, 255, 0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a0 = g.time * 4 + i * 2.1;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.r * (0.5 + 0.18 * i), a0, a0 + 1.4);
      ctx.stroke();
    }
    return true;
  }
  return false;
}

/** spRing / spLine. Returns true if drawn. */
export function drawSpiritFx(ctx, f, p) {
  if (f.type === 'spRing') {
    ctx.strokeStyle = f.color;
    ctx.globalAlpha = 1 - p;
    ctx.lineWidth = 4 * (1 - p) + 1;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.range * (0.4 + 0.6 * p), 0, TAU);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return true;
  }
  if (f.type === 'spLine') {
    ctx.strokeStyle = f.color;
    ctx.globalAlpha = 1 - p;
    ctx.lineWidth = f.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    ctx.lineTo(f.tx, f.ty);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return true;
  }
  return false;
}
