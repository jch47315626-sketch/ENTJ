/**
 * 궁극기 연출: the big, showy effects of the ultimates. Each is a g.fx entry
 * ({ type, x, y, t, life, ... }) drawn in world space by drawUltFx; particles
 * are worked out from a seed every frame, so nothing needs updating.
 */
const TAU = Math.PI * 2;

/** Stable pseudo-random number in [0, 1) for particle `i` of an effect. */
const rnd = (seed, i) => {
  const x = Math.sin(seed * 997.13 + i * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};
const easeOut = (p) => 1 - (1 - p) ** 3;

/** Sparks flung out from a point, falling a little as they fade. */
function sparks(ctx, f, p, n, color, reach, size = 3) {
  const a = 1 - p;
  ctx.fillStyle = color(a);
  for (let i = 0; i < n; i++) {
    const ang = rnd(f.seed, i) * TAU;
    const d = reach * (0.35 + 0.65 * rnd(f.seed, i + 50)) * easeOut(p);
    const x = f.x + Math.cos(ang) * d, y = f.y + Math.sin(ang) * d * 0.8 + p * p * 30;
    ctx.beginPath();
    ctx.arc(x, y, size * (0.5 + rnd(f.seed, i + 90)) * (1 - p * 0.6), 0, TAU);
    ctx.fill();
  }
}

/** A soft radial glow. */
function glow(ctx, x, y, r, rgb, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

const DRAW = {
  /** 궁극기 각성: a golden pillar, a ring and a fountain of sparks where the hero stands. */
  awaken(ctx, f, p) {
    const a = 1 - p;
    const h = 520 * easeOut(Math.min(1, p * 2));
    const w = 46 * (1 - p * 0.5);
    const g = ctx.createLinearGradient(f.x, f.y - h, f.x, f.y);
    g.addColorStop(0, 'rgba(255, 236, 160, 0)');
    g.addColorStop(0.6, `rgba(255, 220, 120, ${0.55 * a})`);
    g.addColorStop(1, `rgba(255, 250, 220, ${0.9 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(f.x - w / 2, f.y - h, w, h);
    glow(ctx, f.x, f.y, 150, '255, 214, 110', 0.6 * a);
    for (const [k, lw] of [[1, 6], [0.7, 3]]) {
      ctx.strokeStyle = `rgba(255, 226, 140, ${0.9 * a})`;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, 200 * k * easeOut(p), 80 * k * easeOut(p), 0, 0, TAU);
      ctx.stroke();
    }
    sparks(ctx, f, p, 40, (al) => `rgba(255, 236, 170, ${al})`, 230, 3.5);
  },

  /** 훈요십조: a scroll unrolls in the sky over the hero. */
  edictScroll(ctx, f, p) {
    const a = p < 0.8 ? 1 : (1 - p) / 0.2;
    const open = easeOut(Math.min(1, p / 0.3));
    const W = 300 * open, H = 70, y = f.y - 150 - p * 20;
    ctx.save();
    ctx.globalAlpha *= a;
    glow(ctx, f.x, y, 260, '255, 210, 110', 0.45);
    ctx.fillStyle = '#f3e3b8';
    ctx.strokeStyle = '#8a5a1e';
    ctx.lineWidth = 3;
    ctx.fillRect(f.x - W / 2, y - H / 2, W, H);
    ctx.strokeRect(f.x - W / 2, y - H / 2, W, H);
    for (const s of [-1, 1]) {
      ctx.fillStyle = '#7a3a18';
      ctx.fillRect(f.x + (s * W) / 2 - 7, y - H / 2 - 8, 14, H + 16);
      ctx.fillStyle = '#e3b964';
      ctx.fillRect(f.x + (s * W) / 2 - 7, y - H / 2 - 12, 14, 6);
      ctx.fillRect(f.x + (s * W) / 2 - 7, y + H / 2 + 6, 14, 6);
    }
    if (open > 0.6) {
      ctx.fillStyle = '#7a1a10';
      ctx.font = "bold 40px 'Nanum Brush Script', serif";
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('訓要十條', f.x, y + 2);
      // A red royal seal in the corner.
      ctx.fillStyle = '#b52a20';
      ctx.fillRect(f.x + W / 2 - 46, y + 6, 22, 22);
    }
    ctx.restore();
  },

  /** 훈요십조 · 어명: a shaft of gold light slams down on a foe. */
  pillar(ctx, f, p) {
    const a = 1 - p;
    const drop = Math.min(1, p / 0.18);
    const top = f.y - 380, bottom = top + (f.y - top) * drop;
    const w = (f.big ? 26 : 16) * (1 - p * 0.6);
    const g = ctx.createLinearGradient(f.x, top, f.x, bottom);
    g.addColorStop(0, 'rgba(255, 236, 160, 0)');
    g.addColorStop(1, `rgba(255, 246, 210, ${0.95 * a})`);
    ctx.fillStyle = g;
    ctx.fillRect(f.x - w / 2, top, w, bottom - top);
    if (drop >= 1) {
      glow(ctx, f.x, f.y, f.big ? 70 : 46, '255, 220, 120', 0.8 * a);
      ctx.strokeStyle = `rgba(255, 230, 150, ${a})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.ellipse(f.x, f.y, 60 * easeOut(p), 22 * easeOut(p), 0, 0, TAU);
      ctx.stroke();
    }
  },

  /** 고려 신궁대: a volley of fire arrows streaking down onto the circle. */
  arrowRain(ctx, f, p) {
    const n = 22;
    for (let i = 0; i < n; i++) {
      const delay = rnd(f.seed, i) * 0.45;
      const q = (p - delay) / 0.3;
      if (q < 0 || q > 1.4) continue;
      const ang = rnd(f.seed, i + 30) * TAU, d = Math.sqrt(rnd(f.seed, i + 60)) * f.range;
      const tx = f.x + Math.cos(ang) * d, ty = f.y + Math.sin(ang) * d * 0.8;
      if (q <= 1) {
        // Falling: a bright streak with a fiery head.
        const hx = tx - 120 * (1 - q), hy = ty - 260 * (1 - q);
        ctx.strokeStyle = 'rgba(255, 180, 80, 0.9)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(hx - 26, hy - 56);
        ctx.lineTo(hx, hy);
        ctx.stroke();
        glow(ctx, hx, hy, 10, '255, 120, 40', 0.9);
      } else {
        glow(ctx, tx, ty, 26, '255, 140, 50', 0.8 * (1.4 - q) / 0.4);
      }
    }
    // The ground under the volley flares up.
    const a = Math.max(0, 1 - Math.abs(p - 0.55) / 0.45);
    glow(ctx, f.x, f.y, f.range * 1.2, '255, 110, 30', 0.45 * a);
  },

  /** 후백제의 패왕 · 가은의 장사: rock and dirt thrown out from an impact. */
  shatter(ctx, f, p) {
    const a = 1 - p;
    glow(ctx, f.x, f.y, f.range * 1.1, '140, 110, 80', 0.45 * a); // dust cloud
    ctx.strokeStyle = `rgba(255, 210, 150, ${0.85 * a})`;
    ctx.lineWidth = 9 * a;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, f.range * easeOut(p), f.range * 0.6 * easeOut(p), 0, 0, TAU);
    ctx.stroke();
    // Cracks in the ground.
    ctx.strokeStyle = `rgba(40, 30, 20, ${0.7 * a})`;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 7; i++) {
      const ang = rnd(f.seed, i) * TAU;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      const l = f.range * (0.5 + 0.5 * rnd(f.seed, i + 20));
      ctx.lineTo(f.x + Math.cos(ang) * l * 0.5 + 8, f.y + Math.sin(ang) * l * 0.35);
      ctx.lineTo(f.x + Math.cos(ang) * l, f.y + Math.sin(ang) * l * 0.65);
      ctx.stroke();
    }
    // Flying stones.
    for (let i = 0; i < 24; i++) {
      const ang = rnd(f.seed, i + 40) * TAU;
      const d = f.range * 1.1 * easeOut(p) * (0.5 + 0.5 * rnd(f.seed, i + 70));
      const x = f.x + Math.cos(ang) * d, y = f.y + Math.sin(ang) * d * 0.7 - Math.sin(p * Math.PI) * 50 * rnd(f.seed, i + 5);
      const s = 4 + 8 * rnd(f.seed, i + 9);
      ctx.fillStyle = `rgba(${110 + 40 * rnd(f.seed, i)}, 100, 86, ${a})`;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(p * 8 + i);
      ctx.fillRect(-s / 2, -s / 2, s, s * 0.8);
      ctx.restore();
    }
    glow(ctx, f.x, f.y, f.range * 0.7, '255, 190, 120', 0.55 * a);
  },

  /** 후백제의 패왕: the rage flares up — a red burst and rising embers. */
  rageBurst(ctx, f, p) {
    const a = 1 - p;
    glow(ctx, f.x, f.y, 180 * easeOut(p), '255, 60, 20', 0.6 * a);
    ctx.strokeStyle = `rgba(255, 120, 40, ${a})`;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(f.x, f.y, 140 * easeOut(p), 0, TAU);
    ctx.stroke();
    sparks(ctx, f, p, 30, (al) => `rgba(255, ${120 + Math.round(80 * al)}, 40, ${al})`, 170, 4);
  },

  /** 독심 관심법: a violet wave rolls out under a great opened eye. */
  mindWave(ctx, f, p) {
    const a = 1 - p;
    for (const k of [1, 0.75, 0.5]) {
      ctx.strokeStyle = `rgba(170, 110, 240, ${0.8 * a * k})`;
      ctx.lineWidth = 6 * k;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.range * easeOut(Math.min(1, p * 1.3)) * k, 0, TAU);
      ctx.stroke();
    }
    glow(ctx, f.x, f.y, f.range * 0.9, '150, 90, 220', 0.35 * a);
    // The eye in the sky.
    const ey = f.y - 140, w = 110 * easeOut(Math.min(1, p * 3)), h = 46;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.fillStyle = 'rgba(30, 10, 50, 0.6)';
    ctx.strokeStyle = '#c99af5';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(f.x - w, ey);
    ctx.quadraticCurveTo(f.x, ey - h * 1.6, f.x + w, ey);
    ctx.quadraticCurveTo(f.x, ey + h * 1.6, f.x - w, ey);
    ctx.fill();
    ctx.stroke();
    glow(ctx, f.x, ey, 40, '255, 210, 110', 0.9);
    ctx.fillStyle = '#ffd36a';
    ctx.beginPath();
    ctx.arc(f.x, ey, 18, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#2a1036';
    ctx.beginPath();
    ctx.ellipse(f.x, ey, 6, 15, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  /** 독심 관심법: a swayed soldier bursts into violet-gold petals. */
  mindBurst(ctx, f, p) {
    const a = 1 - p;
    const rr = f.range * easeOut(p);
    glow(ctx, f.x, f.y, rr * 1.2, '170, 100, 230', 0.5 * a);
    ctx.strokeStyle = `rgba(255, 210, 120, ${0.9 * a})`;
    ctx.lineWidth = 2.5;
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * TAU + p;
      ctx.beginPath();
      ctx.ellipse(f.x + Math.cos(ang) * rr * 0.55, f.y + Math.sin(ang) * rr * 0.55, rr * 0.42, rr * 0.15, ang, 0, TAU);
      ctx.stroke();
    }
    sparks(ctx, f, p, 14, (al) => `rgba(210, 160, 255, ${al})`, f.range * 1.2, 2.5);
  },

  /** 천안 · 애꾸눈의 저주: a burning eye over the marked foe, smoke curling round. */
  curseMark(ctx, f, p, g) {
    const fade = Math.min(1, (f.life - f.t) / 0.4, f.t / 0.2);
    const pulse = 0.85 + 0.15 * Math.sin(g.time * 8 + f.seed * 10);
    const x = f.x, y = f.y - 34;
    ctx.save();
    ctx.globalAlpha *= fade;
    // Smoke ring at the feet.
    for (let i = 0; i < 6; i++) {
      const ang = g.time * 1.5 + (i / 6) * TAU;
      glow(ctx, f.x + Math.cos(ang) * 22, f.y + 8 + Math.sin(ang) * 9, 14, f.big ? '150, 20, 60' : '110, 40, 140', 0.55);
    }
    glow(ctx, x, y, 26 * pulse, f.big ? '255, 40, 60' : '190, 90, 255', 0.7);
    const w = (f.big ? 17 : 13) * pulse, h = w * 0.55;
    ctx.fillStyle = 'rgba(20, 6, 18, 0.85)';
    ctx.strokeStyle = f.big ? '#ff5a6e' : '#d6a6ff';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(x - w, y);
    ctx.quadraticCurveTo(x, y - h * 1.7, x + w, y);
    ctx.quadraticCurveTo(x, y + h * 1.7, x - w, y);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = f.big ? '#ff3040' : '#ffd36a';
    ctx.beginPath();
    ctx.ellipse(x, y, h * 0.55, h * 0.95, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
  },

  /** 애꾸눈의 저주: the curse jumps to a new victim along a crackling line. */
  curseLink(ctx, f, p) {
    const a = 1 - p;
    ctx.strokeStyle = `rgba(255, 70, 110, ${a})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(f.x, f.y);
    const steps = 6;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const jx = i < steps ? (rnd(f.seed, i) - 0.5) * 24 : 0, jy = i < steps ? (rnd(f.seed, i + 9) - 0.5) * 24 : 0;
      ctx.lineTo(f.x + (f.tx - f.x) * t + jx, f.y + (f.ty - f.y) * t + jy);
    }
    ctx.stroke();
    glow(ctx, f.tx, f.ty, 24, '255, 60, 100', 0.8 * a);
  },
};

export const ULT_FX = new Set(Object.keys(DRAW));

/** Draws one 궁극기 effect (returns false if `f` is not one of them). */
export function drawUltFx(ctx, f, p, g) {
  const d = DRAW[f.type];
  if (!d) return false;
  d(ctx, f, p, g);
  return true;
}

/** Screen-wide colour flash at the moment a 궁극기 goes off (drawn in screen space). */
export function drawScreenFlash(ctx, g, w, h) {
  const F = g.screenFlash;
  if (!F || g.time >= F.until) return;
  const k = (F.until - g.time) / F.dur;
  ctx.fillStyle = `rgba(${F.rgb}, ${F.alpha * k})`;
  ctx.fillRect(0, 0, w, h);
}
