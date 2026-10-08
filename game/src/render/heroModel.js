/**
 * 영웅 모델: chibi versions of the three heroes on the key art, drawn with
 * paths (no images). drawUnit draws the body, cape, hands and weapon; this
 * file draws what makes each hero recognisable — the head (face, eyes, hair,
 * crown, beard, eyepatch) and the hair that falls behind the body.
 *
 * Everything is measured in `u`, the head radius, around the head centre.
 */
const INK = '#1d1a17';
const HANJI = '#f1e8d2';

/** Per hero: colours and features taken from the key art. */
export const MODELS = {
  wanggeon: {
    skin: '#f7dcc0', skinShade: '#e9b994', iris: '#3b2a24', irisHi: '#8a6a58',
    hair: '#17151c', hairMid: '#25252f', hairHi: 'rgba(80, 120, 220, 0.55)', mane: 'flow',
    crown: { gold: '#f2c55c', goldDark: '#a8741e', jewel: '#2f6fe8' },
  },
  gyeonhwon: {
    skin: '#e9b98f', skinShade: '#cf9467', iris: '#3a2416', irisHi: '#7a5236',
    hair: '#2f1d12', hairMid: '#4a2e1a', hairHi: 'rgba(150, 100, 60, 0.6)', mane: 'wild',
    beard: '#2a190e', band: '#c0392b', bandDark: '#7e1d14', angry: true,
  },
  gungye: {
    skin: '#f6d6b6', skinShade: '#e2ae88', iris: '#2c2420', irisHi: '#6a5a50',
    bald: true, patch: { rim: '#e3b24a' }, sun: '#3a2a16', hoops: '#e8b84a',
  },
};

const sh = (flash, c) => (flash ? HANJI : c);

/** Long hair falling behind the shoulders (drawn before the body). */
export function drawModelBackHair(ctx, M, r, sx, phase, flash, back) {
  if (M.bald) return;
  const u = r * 0.66 * 1.08;
  const hy = -r * 0.62;
  const sway = Math.sin(phase * 0.5) * r * 0.05;
  const drift = -sx * r * 0.22 + sway;
  const wild = M.mane === 'wild';
  const bottom = r * (wild ? 0.25 : 0.42);
  ctx.save();
  ctx.translate(0, hy);
  const g = ctx.createLinearGradient(0, -u, 0, bottom - hy);
  g.addColorStop(0, sh(flash, M.hairMid));
  g.addColorStop(1, sh(flash, M.hair));
  ctx.fillStyle = g;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.2, r * 0.08);
  ctx.beginPath();
  ctx.moveTo(u * 1.02, -u * 0.1);
  ctx.arc(0, -u * 0.1, u * 1.02, 0, Math.PI, true);
  // Down the far side in jagged locks, across the ends, and back up.
  const locks = wild ? 5 : 4;
  const bot = bottom - hy;
  for (let i = 1; i <= locks; i++) {
    const t = i / locks;
    const x = -(u * 1.05 + t * u * (wild ? 0.55 : 0.4)) + drift * t;
    ctx.lineTo(x - u * 0.28, -u * 0.1 + t * (bot + u * 0.1) - u * 0.18);
    ctx.lineTo(x + u * 0.08, -u * 0.1 + t * (bot + u * 0.1));
  }
  for (let i = 1; i <= 4; i++) {
    const x = -u * 1.45 + (u * 2.9 * i) / 4 + drift;
    ctx.lineTo(x - u * 0.42, bot - u * 0.3);
    ctx.lineTo(x, bot + u * 0.1);
  }
  for (let i = locks - 1; i >= 0; i--) {
    const t = i / locks;
    const x = u * 1.05 + t * u * (wild ? 0.55 : 0.4) + drift * t;
    ctx.lineTo(x + u * 0.28, -u * 0.1 + t * (bot + u * 0.1) + u * 0.12);
    ctx.lineTo(x - u * 0.08, -u * 0.1 + t * (bot + u * 0.1));
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!flash) {
    // Sheen: a few strands catching the light (blue on 왕건, warm brown on 견훤).
    ctx.strokeStyle = M.hairHi;
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.globalAlpha *= 0.85;
    for (const k of [-0.7, 0.75]) {
      ctx.beginPath();
      ctx.moveTo(k * u, -u * 0.6);
      ctx.quadraticCurveTo(k * u * 1.35, bot * 0.3, k * u * 1.15 + drift * 0.8, bot - u * 0.15);
      ctx.stroke();
    }
    ctx.globalAlpha /= 0.85;
  }
  ctx.restore();
}

/** The whole head: face, eyes, hair on top, and each hero's marks. */
export function drawModelHead(ctx, M, r, sx, back, flash, phase) {
  const u = r * 0.66 * 1.08;
  const hy = -r * 0.66;
  ctx.save();
  ctx.translate(0, hy);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const lw = Math.max(1.1, r * 0.06);
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;

  if (M.hoops && !back) hoops(ctx, M, u, flash, lw);
  face(ctx, M, u, flash, back);
  if (back) {
    if (M.bald) baldBack(ctx, M, u, sx, flash, lw);
    else hairBack(ctx, M, u, flash, lw);
    if (M.band) band(ctx, M, u, sx, phase, flash, lw);
    if (M.crown) crown(ctx, M, u, flash, lw);
    ctx.restore();
    return;
  }
  const lx = sx * u * 0.12; // features turn toward where the hero faces
  if (M.beard) beard(ctx, M, u, lx, flash, lw);
  eyes(ctx, M, u, sx, lx, flash, lw);
  if (!M.beard) mouth(ctx, M, u, lx, lw);
  if (M.bald) baldMarks(ctx, M, u, sx, lx, flash, lw);
  else hairFront(ctx, M, u, sx, flash, lw);
  if (M.band) band(ctx, M, u, sx, phase, flash, lw);
  if (M.crown) crown(ctx, M, u, flash, lw);
  ctx.restore();
}

/** Round skull, soft cheeks, small pointed chin; shaded on the far side. */
function facePath(ctx, u) {
  ctx.beginPath();
  ctx.moveTo(u, -u * 0.05);
  ctx.arc(0, -u * 0.05, u, 0, Math.PI, true);
  ctx.bezierCurveTo(-u, u * 0.5, -u * 0.55, u * 0.92, 0, u * 0.98);
  ctx.bezierCurveTo(u * 0.55, u * 0.92, u, u * 0.5, u, -u * 0.05);
  ctx.closePath();
}

function face(ctx, M, u, flash) {
  facePath(ctx, u);
  const g = ctx.createRadialGradient(-u * 0.3, -u * 0.35, u * 0.2, 0, 0, u * 1.2);
  g.addColorStop(0, sh(flash, M.skin));
  g.addColorStop(1, sh(flash, M.skinShade));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.stroke();
}

function eyes(ctx, M, u, sx, lx, flash, lw) {
  const ey = u * 0.2;
  for (const k of [-1, 1]) {
    const x = k * u * 0.38 + lx;
    // 궁예's patch covers the eye on the side he turns toward.
    if (M.patch && k === sx) {
      patch(ctx, M, u, x, ey, k, flash, lw);
      continue;
    }
    const ew = u * 0.27, eh = u * 0.23;
    // White of the eye: an almond, flatter on the inner corner.
    ctx.beginPath();
    ctx.moveTo(x - k * ew, ey + eh * 0.1);
    ctx.quadraticCurveTo(x, ey - eh * 1.25, x + k * ew, ey - eh * 0.2);
    ctx.quadraticCurveTo(x + k * ew * 0.4, ey + eh * 1.15, x - k * ew, ey + eh * 0.1);
    ctx.closePath();
    ctx.fillStyle = flash ? HANJI : '#fbf6ee';
    ctx.fill();
    // Iris and pupil, clipped by the lids.
    ctx.save();
    ctx.clip();
    const ix = x + lx * 0.35, iy = ey + eh * 0.12;
    const ig = ctx.createLinearGradient(0, iy - eh, 0, iy + eh);
    ig.addColorStop(0, sh(flash, '#120c0a'));
    ig.addColorStop(1, sh(flash, M.irisHi));
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.ellipse(ix, iy, ew * 0.58, eh * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sh(flash, '#0a0706');
    ctx.beginPath();
    ctx.ellipse(ix, iy, ew * 0.26, eh * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    if (!flash) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(ix + ew * 0.22, iy - eh * 0.45, ew * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ix - ew * 0.2, iy + eh * 0.45, ew * 0.09, 0, Math.PI * 2);
      ctx.fill();
    }
    // Heavy upper lash line, slanting down toward the nose: the stern look of the key art.
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(lw, u * 0.075);
    ctx.beginPath();
    ctx.moveTo(x - k * ew * 1.15, ey + eh * 0.15);
    ctx.quadraticCurveTo(x - k * ew * 0.2, ey - eh * 1.3, x + k * ew * 1.1, ey - eh * 0.05);
    ctx.stroke();
    ctx.lineWidth = lw * 0.5;
    ctx.beginPath();
    ctx.moveTo(x - k * ew * 0.5, ey + eh * 0.95);
    ctx.lineTo(x + k * ew * 0.6, ey + eh * 0.7);
    ctx.stroke();
    // Brow: thick, tapered, knitted (angrier on 견훤).
    ctx.lineWidth = Math.max(lw, u * (M.angry ? 0.09 : 0.07));
    ctx.strokeStyle = M.bald ? sh(flash, '#4a3428') : INK;
    ctx.beginPath();
    ctx.moveTo(x - k * ew * 1.2, ey - eh * (M.angry ? 2.2 : 2.0));
    ctx.quadraticCurveTo(x, ey - eh * (M.angry ? 2.2 : 2.1), x + k * ew * 1.1, ey - eh * (M.angry ? 1.35 : 1.5));
    ctx.stroke();
  }
  // Nose: just a tick of shadow.
  ctx.strokeStyle = sh(flash, M.skinShade);
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.moveTo(lx * 1.3, u * 0.42);
  ctx.lineTo(lx * 1.3 + u * 0.03 * (lx >= 0 ? 1 : -1), u * 0.5);
  ctx.stroke();
  if (!flash) {
    ctx.fillStyle = 'rgba(230, 120, 110, 0.28)';
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(k * u * 0.52 + lx * 0.6, u * 0.5, u * 0.14, u * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
}

function mouth(ctx, M, u, lx, lw) {
  ctx.lineWidth = lw * 0.9;
  ctx.beginPath();
  ctx.moveTo(lx - u * 0.09, u * 0.66);
  ctx.quadraticCurveTo(lx, u * 0.63, lx + u * 0.09, u * 0.67);
  ctx.stroke();
  ctx.lineWidth = lw;
}

/** 왕건: swept, spiky bangs and long side locks framing the face. */
function hairFront(ctx, M, u, sx, flash, lw) {
  const wild = M.mane === 'wild';
  const g = ctx.createLinearGradient(0, -u * 1.2, 0, u * 0.6);
  g.addColorStop(0, sh(flash, M.hairMid));
  g.addColorStop(1, sh(flash, M.hair));
  ctx.fillStyle = g;
  ctx.lineWidth = lw;
  // Crown of the head down to a jagged fringe.
  ctx.beginPath();
  ctx.moveTo(-u * 1.08, u * 0.3);
  ctx.quadraticCurveTo(-u * 1.18, -u * 0.6, -u * 0.55, -u * 1.0);
  if (wild) {
    // A wild mane: tufts spring up over the crown.
    const tops = [[-0.62, -1.38], [-0.35, -1.05], [-0.1, -1.45], [0.15, -1.08], [0.42, -1.4], [0.62, -1.02]];
    for (const [x, y] of tops) ctx.lineTo(x * u, y * u);
  } else {
    const tops = [[-0.4, -1.22], [-0.22, -1.1], [0.05, -1.3], [0.25, -1.12], [0.42, -1.2]];
    for (const [x, y] of tops) ctx.lineTo(x * u, y * u);
  }
  ctx.quadraticCurveTo(u * 1.18, -u * 0.6, u * 1.08, u * 0.3);
  // Side lock (near side) hanging past the cheek.
  ctx.lineTo(u * 1.0, u * 0.55);
  ctx.lineTo(u * 0.84, u * 0.05);
  // The fringe, swept toward where he faces: long points between short ones.
  // The fringe: long pointed locks curving toward where he faces, with short ones between.
  const tips = wild ? [[0.62, 0.0], [0.2, -0.05], [-0.25, 0.0], [-0.62, -0.02]] : [[0.62, 0.12], [0.24, 0.22], [-0.18, 0.18], [-0.58, 0.1]];
  const roots = wild ? [0.82, 0.42, -0.02, -0.45, -0.8] : [0.82, 0.44, 0.03, -0.4, -0.8];
  ctx.lineTo(roots[0] * u, -u * 0.28);
  tips.forEach(([tx, ty], i) => {
    const r0 = roots[i], r1 = roots[i + 1];
    const bend = sx * 0.12;
    ctx.quadraticCurveTo((r0 + tx) / 2 * u + bend * u, (ty - 0.25) / 2 * u, (tx + bend) * u, ty * u);
    ctx.quadraticCurveTo((tx + r1) / 2 * u, (ty - 0.35) / 2 * u, r1 * u, -u * (i % 2 ? 0.28 : 0.4));
  });
  ctx.lineTo(-u * 0.84, u * 0.05);
  ctx.lineTo(-u * 1.0, u * 0.55);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!flash) {
    // Sheen on the crown.
    ctx.strokeStyle = M.hairHi;
    ctx.lineWidth = lw * 1.1;
    ctx.beginPath();
    ctx.arc(-u * 0.05, -u * 0.25, u * 0.72, Math.PI * 1.15, Math.PI * 1.55);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = lw;
  }
}

/** Back of the head: all hair. */
function hairBack(ctx, M, u, flash, lw) {
  ctx.fillStyle = sh(flash, M.hair);
  ctx.beginPath();
  ctx.moveTo(-u * 1.06, u * 0.6);
  ctx.quadraticCurveTo(-u * 1.2, -u * 0.8, 0, -u * 1.12);
  ctx.quadraticCurveTo(u * 1.2, -u * 0.8, u * 1.06, u * 0.6);
  for (let i = 0; i <= 6; i++) ctx.lineTo(u * (1.0 - i * 0.33), u * (i % 2 ? 0.75 : 1.0));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (!flash) {
    ctx.strokeStyle = M.hairHi;
    ctx.lineWidth = lw;
    for (const k of [-0.4, 0.1, 0.55]) {
      ctx.beginPath();
      ctx.moveTo(k * u, -u * 0.8);
      ctx.quadraticCurveTo(k * u * 1.2, 0, k * u * 0.9, u * 0.7);
      ctx.stroke();
    }
    ctx.strokeStyle = INK;
  }
}

/** 왕건's topknot under a small gold crown set with a blue jewel. */
function crown(ctx, M, u, flash, lw) {
  const C = M.crown;
  ctx.fillStyle = sh(flash, M.hair);
  ctx.beginPath();
  ctx.ellipse(0, -u * 1.12, u * 0.32, u * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const g = ctx.createLinearGradient(0, -u * 1.65, 0, -u * 0.9);
  g.addColorStop(0, sh(flash, '#fff0b0'));
  g.addColorStop(0.5, sh(flash, C.gold));
  g.addColorStop(1, sh(flash, C.goldDark));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-u * 0.5, -u * 0.92);
  ctx.lineTo(-u * 0.6, -u * 1.38);
  ctx.lineTo(-u * 0.3, -u * 1.16);
  ctx.lineTo(-u * 0.14, -u * 1.5);
  ctx.lineTo(0, -u * 1.7);
  ctx.lineTo(u * 0.14, -u * 1.5);
  ctx.lineTo(u * 0.3, -u * 1.16);
  ctx.lineTo(u * 0.6, -u * 1.38);
  ctx.lineTo(u * 0.5, -u * 0.92);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // The jewel: a cut sapphire with a glint.
  ctx.fillStyle = sh(flash, C.jewel);
  ctx.beginPath();
  ctx.moveTo(0, -u * 1.36);
  ctx.lineTo(u * 0.15, -u * 1.16);
  ctx.lineTo(0, -u * 0.98);
  ctx.lineTo(-u * 0.15, -u * 1.16);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = lw * 0.7;
  ctx.stroke();
  if (!flash) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(-u * 0.04, -u * 1.22, u * 0.04, 0, Math.PI * 2);
    ctx.fill();
    // Two little blue beads hanging at the sides.
    ctx.fillStyle = C.jewel;
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(k * u * 0.5, -u * 0.86, u * 0.08, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.lineWidth = lw;
}

/** 견훤: a full beard and moustache over the jaw. */
function beard(ctx, M, u, lx, flash, lw) {
  ctx.fillStyle = sh(flash, M.beard);
  ctx.beginPath();
  ctx.moveTo(-u * 0.92, u * 0.2);
  ctx.quadraticCurveTo(-u * 0.85, u * 0.85, -u * 0.35, u * 1.1);
  ctx.lineTo(lx - u * 0.12, u * 1.3);
  ctx.lineTo(lx, u * 1.18);
  ctx.lineTo(lx + u * 0.12, u * 1.3);
  ctx.lineTo(u * 0.35, u * 1.1);
  ctx.quadraticCurveTo(u * 0.85, u * 0.85, u * 0.92, u * 0.2);
  // Inner edge: cheeks bare, the beard rising round the mouth.
  ctx.quadraticCurveTo(u * 0.68, u * 0.62, lx + u * 0.3, u * 0.6);
  ctx.quadraticCurveTo(lx, u * 0.52, lx - u * 0.3, u * 0.6);
  ctx.quadraticCurveTo(-u * 0.68, u * 0.62, -u * 0.92, u * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Moustache and a hard-set mouth inside the beard.
  ctx.beginPath();
  ctx.moveTo(lx - u * 0.3, u * 0.72);
  ctx.quadraticCurveTo(lx, u * 0.52, lx + u * 0.3, u * 0.72);
  ctx.quadraticCurveTo(lx, u * 0.64, lx - u * 0.3, u * 0.72);
  ctx.fill();
  ctx.strokeStyle = sh(flash, '#6e2a20');
  ctx.lineWidth = lw * 0.9;
  ctx.beginPath();
  ctx.moveTo(lx - u * 0.1, u * 0.8);
  ctx.lineTo(lx + u * 0.1, u * 0.8);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
}

/** 견훤's red headband, its two ends streaming behind. */
function band(ctx, M, u, sx, phase, flash, lw) {
  ctx.fillStyle = sh(flash, M.band);
  ctx.beginPath();
  ctx.moveTo(-u * 1.04, -u * 0.42);
  ctx.quadraticCurveTo(0, -u * 0.62, u * 1.04, -u * 0.42);
  ctx.lineTo(u * 1.02, -u * 0.2);
  ctx.quadraticCurveTo(0, -u * 0.4, -u * 1.02, -u * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = sh(flash, M.band);
  ctx.lineWidth = lw * 1.6;
  for (const d of [0, 0.3]) {
    ctx.beginPath();
    ctx.moveTo(-sx * u * 1.0, -u * 0.32);
    ctx.quadraticCurveTo(-sx * u * 1.6, -u * (0.2 - d) + Math.sin(phase + d * 6) * u * 0.12, -sx * u * (2.0 - d), u * (0.15 + d));
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
}

/** 궁예: shine on the shaved head and the sun drawn on his brow. */
function baldMarks(ctx, M, u, sx, lx, flash, lw) {
  if (!flash) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.beginPath();
    ctx.ellipse(-u * 0.35, -u * 0.62, u * 0.26, u * 0.13, -0.5, 0, Math.PI * 2);
    ctx.fill();
  }
  const cx = -sx * u * 0.12, cy = -u * 0.55;
  ctx.strokeStyle = sh(flash, M.sun);
  ctx.fillStyle = sh(flash, M.sun);
  ctx.lineWidth = Math.max(1, lw * 0.7);
  ctx.beginPath();
  ctx.arc(cx, cy, u * 0.12, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * u * 0.18, cy + Math.sin(a) * u * 0.18);
    ctx.lineTo(cx + Math.cos(a) * u * 0.27, cy + Math.sin(a) * u * 0.27);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
}

/** The black eyepatch with a gold rim, its strap running over the skull. */
function patch(ctx, M, u, x, ey, k, flash, lw) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 1.1;
  ctx.beginPath();
  ctx.moveTo(x - k * u * 0.25, ey - u * 0.15);
  ctx.quadraticCurveTo(0, -u * 0.25, -k * u * 0.98, -u * 0.25);
  ctx.stroke();
  ctx.fillStyle = sh(flash, '#16110e');
  ctx.beginPath();
  ctx.ellipse(x, ey - u * 0.02, u * 0.32, u * 0.27, k * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = sh(flash, M.patch.rim);
  ctx.lineWidth = lw * 0.6;
  ctx.stroke();
  // A small gold emblem on the patch.
  ctx.beginPath();
  ctx.arc(x, ey - u * 0.02, u * 0.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = sh(flash, M.patch.rim);
  ctx.beginPath();
  ctx.arc(x, ey - u * 0.02, u * 0.035, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
}

function baldBack(ctx, M, u, sx, flash, lw) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw * 1.1;
  ctx.beginPath();
  ctx.moveTo(-u * 0.98, -u * 0.1);
  ctx.quadraticCurveTo(0, -u * 0.55, u * 0.98, -u * 0.1);
  ctx.stroke();
  if (!flash) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.ellipse(u * 0.3, -u * 0.6, u * 0.24, u * 0.12, 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** 궁예's big gold hoops. */
function hoops(ctx, M, u, flash, lw) {
  ctx.strokeStyle = sh(flash, M.hoops);
  ctx.lineWidth = lw * 1.1;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(k * u * 0.98, u * 0.45, u * 0.17, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = lw;
}
