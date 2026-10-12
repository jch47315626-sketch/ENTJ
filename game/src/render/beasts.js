/**
 * The four guardians of 사신의 제단, drawn as chibi beasts in the same ink
 * style as the soldiers: 청룡 (a coiling dragon), 주작 (a fire bird),
 * 백호 (a white tiger) and 현무 (a turtle with a snake). Called from
 * drawUnit when `look.beast` is set; (x, y) is the spot on the ground.
 */
const INK = '#1d1a17';
const HANJI = '#f1e8d2';
const TAU = Math.PI * 2;

export function drawBeast(ctx, look, x, y, r, facing, o = {}) {
  r *= o.scale ?? 1.35;
  const now = performance.now() / 1000;
  const sx = Math.cos(facing) < 0 ? -1 : 1;
  const fill = (c) => (o.flash ? HANJI : c);
  // Shadow (flyers cast a smaller one, further below).
  const flying = look.beast === 'dragon' || look.beast === 'phoenix';
  ctx.fillStyle = 'rgba(22, 19, 15, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.6, r * (flying ? 1.0 : 1.5), r * (flying ? 0.35 : 0.5), 0, 0, TAU);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y);
  if (o.shake) ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
  if (o.aura) {
    ctx.fillStyle = o.aura;
    ctx.beginPath();
    ctx.arc(0, -r * 0.5, r * 1.9, 0, TAU);
    ctx.fill();
  }
  ctx.lineWidth = Math.max(1.2, r * 0.07);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.scale(sx, 1); // everything below faces right
  const phase = now + (x * 0.013 + y * 0.017);
  BEASTS[look.beast]?.(ctx, look, r, phase, fill);
  ctx.restore();
}

function blob(ctx, x, y, rx, ry, color, rot = 0) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fill();
  ctx.stroke();
}

function eye(ctx, x, y, s, iris) {
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 1.15, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = iris;
  ctx.beginPath();
  ctx.arc(x + s * 0.2, y + s * 0.1, s * 0.7, 0, TAU);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x + s * 0.25, y + s * 0.15, s * 0.38, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x - s * 0.05, y - s * 0.3, s * 0.25, 0, TAU);
  ctx.fill();
}

const BEASTS = {
  /** 청룡: a long body that ripples behind a horned head, floating. */
  dragon(ctx, L, r, t, fill) {
    const lift = -r * 0.9 + Math.sin(t * 2.2) * r * 0.12;
    const seg = 9;
    const pts = [];
    for (let i = 0; i < seg; i++) {
      const u = i / (seg - 1); // 0 tail → 1 neck
      pts.push({ x: -r * 2.1 + u * r * 2.4, y: lift + Math.sin(t * 4 - u * 5) * r * 0.32 * (1 - u * 0.5), s: r * (0.22 + 0.2 * u) });
    }
    // Tail fin.
    const tl = pts[0];
    ctx.fillStyle = fill(L.trim);
    ctx.beginPath();
    ctx.moveTo(tl.x, tl.y);
    ctx.lineTo(tl.x - r * 0.45, tl.y - r * 0.3);
    ctx.lineTo(tl.x - r * 0.3, tl.y + r * 0.05);
    ctx.lineTo(tl.x - r * 0.45, tl.y + r * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Spine fins, then body segments (back to front).
    for (let i = 1; i < seg; i += 2) {
      const p = pts[i];
      ctx.fillStyle = fill(L.trim);
      ctx.beginPath();
      ctx.moveTo(p.x - p.s * 0.6, p.y - p.s * 0.7);
      ctx.lineTo(p.x, p.y - p.s * 1.6);
      ctx.lineTo(p.x + p.s * 0.6, p.y - p.s * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    for (const p of pts) blob(ctx, p.x, p.y, p.s, p.s, fill(L.body));
    for (const p of pts) {
      ctx.fillStyle = fill('#f6e7b0');
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + p.s * 0.45, p.s * 0.7, p.s * 0.35, 0, 0, TAU);
      ctx.fill();
    }
    // Little claws under the front.
    const c = pts[seg - 3];
    for (const k of [-1, 1]) {
      ctx.strokeStyle = INK;
      ctx.beginPath();
      ctx.moveTo(c.x + k * r * 0.12, c.y + c.s * 0.8);
      ctx.lineTo(c.x + k * r * 0.18, c.y + c.s * 1.5);
      ctx.stroke();
      blob(ctx, c.x + k * r * 0.18, c.y + c.s * 1.55, r * 0.08, r * 0.06, fill(L.trim));
    }
    // Head.
    const n = pts[seg - 1];
    const hx = n.x + r * 0.5, hy = n.y - r * 0.25;
    // Antlers.
    ctx.strokeStyle = fill(L.trim);
    ctx.lineWidth = r * 0.09;
    for (const k of [0, 1]) {
      const bx = hx - r * 0.15 - k * r * 0.12;
      ctx.beginPath();
      ctx.moveTo(bx, hy - r * 0.3);
      ctx.lineTo(bx - r * 0.25, hy - r * 0.85);
      ctx.moveTo(bx - r * 0.13, hy - r * 0.58);
      ctx.lineTo(bx + r * 0.05, hy - r * 0.8);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.strokeStyle = INK;
    // Mane.
    ctx.fillStyle = fill(L.trim);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.6 + i * 0.22);
      ctx.moveTo(hx - r * 0.2, hy);
      ctx.lineTo(hx - r * 0.2 + Math.cos(a) * r * 0.55, hy + Math.sin(a) * r * 0.45 + Math.sin(t * 6 + i) * r * 0.04);
    }
    ctx.stroke();
    blob(ctx, hx, hy, r * 0.42, r * 0.36, fill(L.body));
    blob(ctx, hx + r * 0.38, hy + r * 0.1, r * 0.28, r * 0.2, fill(L.body));
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(hx + r * 0.55, hy + r * 0.02, r * 0.04, 0, TAU);
    ctx.fill();
    eye(ctx, hx + r * 0.05, hy - r * 0.08, r * 0.13, '#f2c84a');
    // Whiskers.
    ctx.strokeStyle = fill(L.trim);
    ctx.lineWidth = r * 0.04;
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.5, hy + r * 0.12);
    ctx.quadraticCurveTo(hx + r * 0.9, hy + r * 0.1 + Math.sin(t * 5) * r * 0.1, hx + r * 1.1, hy - r * 0.2);
    ctx.moveTo(hx + r * 0.45, hy + r * 0.2);
    ctx.quadraticCurveTo(hx + r * 0.8, hy + r * 0.45, hx + r * 1.0, hy + r * 0.35 + Math.sin(t * 5 + 1) * r * 0.1);
    ctx.stroke();
    // A pearl (여의주) held by the front claw.
    const glow = 0.6 + 0.4 * Math.sin(t * 5);
    ctx.fillStyle = `rgba(160, 240, 255, ${0.35 * glow})`;
    ctx.beginPath();
    ctx.arc(c.x + r * 0.3, c.y + c.s * 1.5, r * 0.22, 0, TAU);
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, r * 0.05);
    ctx.strokeStyle = INK;
    blob(ctx, c.x + r * 0.3, c.y + c.s * 1.5, r * 0.11, r * 0.11, fill('#dff8ff'));
  },

  /** 주작: a red bird with beating wings and a long flame tail. */
  phoenix(ctx, L, r, t, fill) {
    const lift = -r * 1.0 + Math.sin(t * 3) * r * 0.1;
    const flap = Math.sin(t * 9);
    // Tail plumes, flickering.
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i - 2) * 0.18 + Math.sin(t * 6 + i) * 0.06;
      const len = r * (1.4 + (i % 2) * 0.4);
      const ex = Math.cos(a) * len, ey = lift + r * 0.2 + Math.sin(a) * len * 0.5 + r * 0.25;
      ctx.fillStyle = fill(i % 2 ? L.trim : L.body);
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, lift + r * 0.15);
      ctx.quadraticCurveTo(ex * 0.5, ey - r * 0.25, ex, ey);
      ctx.quadraticCurveTo(ex * 0.55, ey + r * 0.15, -r * 0.3, lift + r * 0.3);
      ctx.fill();
      ctx.stroke();
      blob(ctx, ex, ey, r * 0.1, r * 0.1, fill('#ffe9a0'));
    }
    // Back wing.
    const wing = (k, color) => {
      const up = flap * k;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-r * 0.1, lift - r * 0.1);
      ctx.quadraticCurveTo(-r * 0.7, lift - r * (0.9 + 0.5 * up), -r * 1.3, lift - r * (0.5 + 0.7 * up));
      ctx.lineTo(-r * 0.95, lift - r * (0.25 + 0.35 * up));
      ctx.lineTo(-r * 1.15, lift - r * (0.05 + 0.2 * up));
      ctx.lineTo(-r * 0.75, lift + r * 0.05);
      ctx.quadraticCurveTo(-r * 0.4, lift + r * 0.2, -r * 0.1, lift + r * 0.1);
      ctx.fill();
      ctx.stroke();
    };
    wing(0.8, fill(L.accent));
    blob(ctx, 0, lift, r * 0.62, r * 0.5, fill(L.body));
    ctx.fillStyle = fill('#ffd27a');
    ctx.beginPath();
    ctx.ellipse(r * 0.12, lift + r * 0.18, r * 0.36, r * 0.26, 0, 0, TAU);
    ctx.fill();
    wing(1, fill(L.trim));
    // Head with crest.
    const hx = r * 0.5, hy = lift - r * 0.45;
    ctx.fillStyle = fill(L.trim);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(hx - r * 0.05, hy - r * 0.2);
      ctx.quadraticCurveTo(hx - r * (0.3 + i * 0.15), hy - r * (0.7 + i * 0.1), hx - r * (0.5 + i * 0.12), hy - r * (0.55 - i * 0.12) + Math.sin(t * 7 + i) * r * 0.05);
      ctx.quadraticCurveTo(hx - r * 0.25, hy - r * 0.35, hx - r * 0.05, hy - r * 0.2);
      ctx.fill();
      ctx.stroke();
    }
    blob(ctx, hx, hy, r * 0.32, r * 0.3, fill(L.body));
    ctx.fillStyle = fill('#f2c84a');
    ctx.beginPath();
    ctx.moveTo(hx + r * 0.26, hy - r * 0.04);
    ctx.lineTo(hx + r * 0.58, hy + r * 0.06);
    ctx.lineTo(hx + r * 0.24, hy + r * 0.15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    eye(ctx, hx + r * 0.08, hy - r * 0.04, r * 0.1, '#e0503a');
    // Embers.
    for (let i = 0; i < 4; i++) {
      const u = (t * 0.8 + i * 0.25) % 1;
      ctx.fillStyle = `rgba(255, ${170 + i * 20}, 80, ${0.8 * (1 - u)})`;
      ctx.beginPath();
      ctx.arc(-r * (0.6 + u * 1.2) + Math.sin(i * 7) * r * 0.3, lift + r * 0.3 - u * r * 1.0, r * 0.06 * (1 - u) + 1, 0, TAU);
      ctx.fill();
    }
  },

  /** 백호: a stocky white tiger on four padding legs. */
  tiger(ctx, L, r, t, fill) {
    const step = Math.sin(t * 10);
    const by = -r * 0.45;
    // Tail.
    ctx.strokeStyle = INK;
    ctx.lineWidth = r * 0.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, by - r * 0.05);
    ctx.quadraticCurveTo(-r * 1.5, by - r * 0.2, -r * 1.35, by - r * (0.8 + 0.1 * Math.sin(t * 4)));
    ctx.stroke();
    ctx.strokeStyle = fill(L.body);
    ctx.lineWidth = r * 0.12;
    ctx.stroke();
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.strokeStyle = INK;
    // Legs (far pair first).
    const leg = (lx, k, color) => blob(ctx, lx + k * r * 0.08, by + r * 0.5, r * 0.17, r * 0.24, color);
    leg(-r * 0.55, -step, fill('#cfd3dc'));
    leg(r * 0.45, step, fill('#cfd3dc'));
    blob(ctx, 0, by, r * 0.95, r * 0.55, fill(L.body));
    // Stripes.
    ctx.strokeStyle = fill(L.accent);
    ctx.lineWidth = r * 0.09;
    for (const sxp of [-0.55, -0.25, 0.05, 0.35]) {
      ctx.beginPath();
      ctx.moveTo(r * sxp, by - r * 0.52);
      ctx.quadraticCurveTo(r * (sxp + 0.1), by - r * 0.2, r * (sxp - 0.02), by + r * 0.05);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.strokeStyle = INK;
    leg(-r * 0.35, step, fill(L.body));
    leg(r * 0.65, -step, fill(L.body));
    // Head.
    const hx = r * 0.85, hy = by - r * 0.45;
    for (const k of [-1, 1]) {
      blob(ctx, hx + k * r * 0.32, hy - r * 0.38, r * 0.15, r * 0.15, fill(L.body));
      ctx.fillStyle = fill('#f2b0b0');
      ctx.beginPath();
      ctx.arc(hx + k * r * 0.32, hy - r * 0.38, r * 0.07, 0, TAU);
      ctx.fill();
    }
    blob(ctx, hx, hy, r * 0.55, r * 0.48, fill(L.body));
    ctx.strokeStyle = fill(L.accent);
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.moveTo(hx - r * 0.12, hy - r * 0.46);
    ctx.lineTo(hx - r * 0.06, hy - r * 0.28);
    ctx.moveTo(hx + r * 0.05, hy - r * 0.48);
    ctx.lineTo(hx + r * 0.05, hy - r * 0.3);
    ctx.moveTo(hx + r * 0.2, hy - r * 0.46);
    ctx.lineTo(hx + r * 0.15, hy - r * 0.28);
    ctx.moveTo(hx - r * 0.55, hy + r * 0.0);
    ctx.lineTo(hx - r * 0.35, hy + r * 0.05);
    ctx.moveTo(hx + r * 0.55, hy + r * 0.0);
    ctx.lineTo(hx + r * 0.35, hy + r * 0.05);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.strokeStyle = INK;
    blob(ctx, hx + r * 0.08, hy + r * 0.2, r * 0.24, r * 0.16, fill('#ffffff'));
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(hx + r * 0.08, hy + r * 0.1, r * 0.07, r * 0.05, 0, 0, TAU);
    ctx.fill();
    eye(ctx, hx - r * 0.18, hy - r * 0.08, r * 0.11, L.trim);
    eye(ctx, hx + r * 0.3, hy - r * 0.08, r * 0.11, L.trim);
  },

  /** 현무: a dark turtle under a ridged shell, a snake coiled over it. */
  turtle(ctx, L, r, t, fill) {
    const step = Math.sin(t * 6);
    const by = -r * 0.45;
    // Legs.
    for (const [lx, k] of [[-0.7, step], [0.55, -step], [-0.4, -step], [0.85, step]]) blob(ctx, r * lx + k * r * 0.05, by + r * 0.45, r * 0.2, r * 0.18, fill(L.trim));
    // Head (pokes out in front).
    const hx = r * 1.15, hy = by + r * 0.05 + Math.sin(t * 2) * r * 0.04;
    blob(ctx, hx, hy, r * 0.32, r * 0.27, fill(L.trim));
    eye(ctx, hx + r * 0.08, hy - r * 0.06, r * 0.09, '#2a2a2a');
    // Shell.
    ctx.fillStyle = fill(L.body);
    ctx.beginPath();
    ctx.moveTo(-r * 1.05, by + r * 0.25);
    ctx.quadraticCurveTo(-r * 1.0, by - r * 0.95, 0, by - r * 0.95);
    ctx.quadraticCurveTo(r * 1.0, by - r * 0.95, r * 1.05, by + r * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = fill(L.accent);
    for (const [cx, cy, s] of [[0, -0.5, 0.3], [-0.55, -0.25, 0.22], [0.55, -0.25, 0.22], [-0.3, 0.05, 0.16], [0.3, 0.05, 0.16]]) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * TAU) / 6;
        ctx.lineTo(r * cx + Math.cos(a) * r * s, by + r * cy + Math.sin(a) * r * s * 0.75);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = fill('#c9b27a');
    ctx.fillRect(-r * 1.05, by + r * 0.18, r * 2.1, r * 0.12);
    ctx.strokeRect(-r * 1.05, by + r * 0.18, r * 2.1, r * 0.12);
    // The snake: from behind the shell, arching over, head raised.
    const sway = Math.sin(t * 3) * r * 0.12;
    ctx.strokeStyle = INK;
    ctx.lineWidth = r * 0.24;
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, by + r * 0.1);
      ctx.bezierCurveTo(-r * 0.9, by - r * 1.5, r * 0.3, by - r * 1.4, r * 0.15 + sway, by - r * 1.75);
    };
    path();
    ctx.stroke();
    ctx.strokeStyle = fill('#3fa86a');
    ctx.lineWidth = r * 0.16;
    path();
    ctx.stroke();
    ctx.lineWidth = Math.max(1.2, r * 0.07);
    ctx.strokeStyle = INK;
    const sx = r * 0.15 + sway, sy = by - r * 1.8;
    blob(ctx, sx + r * 0.1, sy, r * 0.22, r * 0.16, fill('#3fa86a'));
    eye(ctx, sx + r * 0.12, sy - r * 0.04, r * 0.07, '#f2c84a');
    if (Math.sin(t * 4) > 0.2) {
      ctx.strokeStyle = '#c0392b';
      ctx.lineWidth = r * 0.04;
      ctx.beginPath();
      ctx.moveTo(sx + r * 0.3, sy + r * 0.04);
      ctx.lineTo(sx + r * 0.48, sy + r * 0.06);
      ctx.lineTo(sx + r * 0.54, sy);
      ctx.moveTo(sx + r * 0.48, sy + r * 0.06);
      ctx.lineTo(sx + r * 0.54, sy + r * 0.12);
      ctx.stroke();
    }
  },
};
