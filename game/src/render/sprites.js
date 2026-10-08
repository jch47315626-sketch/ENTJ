const INK = '#1d1a17';
const HANJI = '#f1e8d2';
const UNIT_SCALE = 1.35;

/** Painted heads (assets/ui/hero, cut from the key art), loaded once and drawn when ready. */
const HEADS = {};
function headImage(src) {
  if (typeof Image === 'undefined') return null;
  let im = HEADS[src];
  if (!im) {
    im = HEADS[src] = new Image();
    im.src = src;
  }
  return im.complete && im.naturalWidth ? im : null;
}

/** Soft ground shadow under every unit. */
export function drawShadow(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(22, 19, 15, 0.3)';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.55, r * 1.05, r * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draws a chibi figure seen from the front: a big round head with a face,
 * a small body, little feet that patter while walking. The figure turns
 * left or right with `facing`; the weapon points along `facing`.
 * look = { body, accent, hat, weapon, skin?, trim?, plume?, mount?,
 *          cape?, beard?, mustache?, brows?, eyepatch?, bulk?, blush? }
 */
export function drawUnit(ctx, look, x, y, r, facing, o = {}) {
  // Chibi figures are drawn a little larger than their hit circle.
  r *= o.scale ?? UNIT_SCALE;
  drawShadow(ctx, x, y, r * (look.mount ? 1.5 : 1));
  ctx.save();
  ctx.translate(x, y);
  if (o.shake) ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
  if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;

  if (o.elite) {
    ctx.strokeStyle = 'rgba(142, 31, 23, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.5, r * 1.25, r * 0.55, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (o.aura) {
    ctx.fillStyle = o.aura;
    ctx.beginPath();
    ctx.arc(0, -r * 0.2, r * 1.55, 0, Math.PI * 2);
    ctx.fill();
  }

  const sx = Math.cos(facing) < 0 ? -1 : 1; // which way the figure turns
  const back = Math.sin(facing) < -0.75; // walking away: show the back of the head
  // Hop while moving: each unit has its own phase from its position.
  const now = performance.now() / 1000;
  const phase = now * 11 + (x * 0.037 + y * 0.051);
  const hop = Math.abs(Math.sin(phase)) * r * 0.1;
  const fill = (c) => (o.flash ? HANJI : c);

  ctx.lineWidth = Math.max(1.2, r * 0.09);
  ctx.strokeStyle = INK;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (look.mount) {
    drawHorse(ctx, look.mount, r, o.flash, sx, phase);
    ctx.translate(0, -r * 0.55);
  }
  ctx.translate(0, -hop);

  const bulk = look.bulk ?? 1;
  const weaponFirst = back;
  // Attack swing (o.swing = { k: 0..1, style, dir }): the weapon arm moves with the blow.
  const sw = o.swing;
  let swingRot = 0, reach = 0, swingScale = 1;
  if (sw) {
    const k = Math.min(1, Math.max(0, sw.k));
    const ease = 1 - (1 - k) ** 3;
    if (sw.style === 'slash') {
      // 왕건: a quick sweep from one side across to the other.
      swingRot = sw.dir * (-1.5 + 3 * ease);
      reach = Math.sin(k * Math.PI) * 0.25;
    } else if (sw.style === 'spin') {
      // 태조의 검: a full turn.
      swingRot = sw.dir * Math.PI * 2 * ease;
      reach = 0.3;
    } else if (sw.style === 'chop') {
      // 견훤: heave the blade up and back, then slam it down hard.
      swingRot = k < 0.35 ? -1.9 * (k / 0.35) : -1.9 + 2.9 * Math.min(1, (k - 0.35) / 0.2);
      swingRot *= sw.dir;
      reach = k < 0.35 ? -0.1 : 0.35 * (1 - (k - 0.35) / 0.65);
      swingScale = k > 0.35 && k < 0.6 ? 1.12 : 1;
    } else if (sw.style === 'cast') {
      // 궁예: thrust the staff forward.
      reach = Math.sin(k * Math.PI) * 0.6;
      swingRot = -sw.dir * 0.4 * Math.sin(k * Math.PI);
    }
  }
  const handAt = () => {
    const a = facing + swingRot;
    const sxh = sx * r * 0.55 * bulk, syh = r * 0.15;
    return { x: sxh + Math.cos(a) * r * reach, y: syh + Math.sin(a) * r * reach };
  };
  const weapon = () => {
    ctx.save();
    const h = handAt();
    ctx.translate(h.x, h.y);
    ctx.rotate(facing + swingRot);
    ctx.scale(0.8 * swingScale, 0.8 * swingScale);
    ctx.translate(-r * 0.2, -r * 0.66);
    ctx.lineWidth = 1.6;
    drawWeapon(ctx, look.weapon, r, look);
    ctx.restore();
  };

  // Cape behind everything.
  if (look.cape) {
    ctx.fillStyle = fill(look.cape);
    ctx.beginPath();
    ctx.moveTo(-r * 0.5 * bulk, -r * 0.05);
    ctx.quadraticCurveTo(-sx * r * 0.9, r * 0.5, -sx * r * 0.75 - r * 0.2, r * 0.78 + Math.sin(phase) * r * 0.06);
    ctx.lineTo(r * 0.6 * bulk, r * 0.62);
    ctx.lineTo(r * 0.5 * bulk, -r * 0.05);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (look.hair && (back || !look.headImg)) drawLongHair(ctx, look, r, sx, phase, o.flash);
  if (weaponFirst && look.weapon) weapon();

  // Feet patter in turn.
  if (!look.mount) {
    ctx.fillStyle = fill(look.accent ?? '#2a2420');
    for (const k of [-1, 1]) {
      const lift = Math.max(0, Math.sin(phase + (k > 0 ? 0 : Math.PI))) * r * 0.12;
      ctx.beginPath();
      ctx.ellipse(k * r * 0.26, r * 0.68 - lift, r * 0.2, r * 0.13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  // Body: a little rounded robe or coat.
  ctx.fillStyle = fill(look.body);
  ctx.beginPath();
  ctx.moveTo(-r * 0.42 * bulk, -r * 0.1);
  ctx.quadraticCurveTo(-r * 0.7 * bulk, r * 0.62, -r * 0.5 * bulk, r * 0.66);
  ctx.lineTo(r * 0.5 * bulk, r * 0.66);
  ctx.quadraticCurveTo(r * 0.7 * bulk, r * 0.62, r * 0.42 * bulk, -r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (look.plates) {
    ctx.strokeStyle = 'rgba(210, 214, 218, 0.6)';
    for (const k of [0.15, 0.35, 0.52]) {
      ctx.beginPath();
      ctx.moveTo(-r * 0.48 * bulk, k * r);
      ctx.lineTo(r * 0.48 * bulk, k * r);
      ctx.stroke();
    }
    ctx.strokeStyle = INK;
  }
  if (look.trim) {
    // Collar and belt.
    ctx.strokeStyle = look.trim;
    ctx.lineWidth = Math.max(1.5, r * 0.11);
    ctx.beginPath();
    ctx.moveTo(-r * 0.3 * bulk, -r * 0.05);
    ctx.lineTo(0, r * 0.18);
    ctx.lineTo(r * 0.3 * bulk, -r * 0.05);
    ctx.moveTo(-r * 0.56 * bulk, r * 0.4);
    ctx.lineTo(r * 0.56 * bulk, r * 0.4);
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.2, r * 0.09);
  }
  if (look.tassel) {
    ctx.fillStyle = look.tassel;
    ctx.fillRect(-sx * r * 0.55, r * 0.2, r * 0.18, r * 0.3);
  }
  if (look.beads) {
    // 염주: a loop of dark beads with one gold bead at the bottom.
    for (let i = 0; i <= 8; i++) {
      const t = i / 8 - 0.5;
      const big = i === 4;
      ctx.fillStyle = fill(big ? look.trim ?? '#e0b24c' : look.beads);
      ctx.beginPath();
      ctx.arc(t * r * 0.72 * bulk, r * 0.04 + (1 - (2 * t) ** 2) * r * 0.36, r * (big ? 0.1 : 0.075), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (look.pauldrons) {
    // Gold shoulder plates.
    for (const k of [-1, 1]) {
      ctx.fillStyle = fill(look.pauldrons);
      ctx.beginPath();
      ctx.ellipse(k * r * 0.46 * bulk, r * 0.02, r * 0.24, r * 0.17, k * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 244, 200, 0.75)';
      ctx.lineWidth = Math.max(1, r * 0.05);
      ctx.beginPath();
      ctx.arc(k * r * 0.46 * bulk, r * 0.06, r * 0.14, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.2, r * 0.09);
    }
  }
  if (look.fur) {
    // White fur collar, fluffy round tufts across the shoulders.
    ctx.fillStyle = fill(look.fur);
    ctx.strokeStyle = 'rgba(120, 110, 100, 0.7)';
    ctx.lineWidth = Math.max(1, r * 0.05);
    for (let i = 0; i < 6; i++) {
      const t = i / 5 - 0.5;
      ctx.beginPath();
      ctx.arc(t * r * 0.86 * bulk, -r * 0.08 + Math.abs(t) * r * 0.06, r * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.2, r * 0.09);
  }
  // Little round hands; mid-swing the weapon hand follows the blade on a short arm.
  ctx.fillStyle = fill(look.skin ?? '#e6c49c');
  for (const k of [-1, 1]) {
    let hx = k * r * 0.55 * bulk, hy = r * 0.25;
    if (sw && k === sx) {
      const h = handAt();
      hx = h.x;
      hy = h.y + r * 0.1;
      ctx.strokeStyle = fill(look.body);
      ctx.lineWidth = r * 0.22;
      ctx.beginPath();
      ctx.moveTo(sx * r * 0.35 * bulk, r * 0.05);
      ctx.lineTo(hx, hy);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.2, r * 0.09);
    }
    ctx.beginPath();
    ctx.arc(hx, hy, r * 0.13, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  drawHead(ctx, look, r, o.flash, sx, back, phase);
  if (!weaponFirst && look.weapon) weapon();
  ctx.restore();
}

/** Long hair falling down the back (hero looks with `hair`; `hairTint` adds streaks). */
function drawLongHair(ctx, look, r, sx, phase, flash) {
  const hr = r * 0.66, hy = -r * 0.62;
  const sway = Math.sin(phase * 0.5) * r * 0.06;
  const drift = -sx * r * 0.28 + sway; // hair streams behind the way he runs
  const bottom = r * 0.32;
  ctx.fillStyle = fillOr(flash, look.hair);
  ctx.beginPath();
  // A wild, spiky mane that flares out toward the shoulders.
  const side = (k, t) => [k * (hr * 1.1 + t * hr * 0.4) + drift * t, hy + (bottom - hy) * t];
  ctx.moveTo(hr * 1.08, hy);
  ctx.arc(0, hy, hr * 1.08, 0, Math.PI, true);
  for (let i = 1; i <= 4; i++) {
    const [x, y] = side(-1, i / 4);
    ctx.lineTo(x - hr * 0.22, y - hr * 0.15);
    ctx.lineTo(x + hr * 0.08, y);
  }
  for (let i = 1; i <= 4; i++) {
    const x = -hr * 1.5 + (hr * 3 * i) / 4 + drift;
    ctx.lineTo(x - hr * 0.35, bottom - r * 0.18);
    ctx.lineTo(x, bottom + r * 0.06);
  }
  for (let i = 3; i >= 0; i--) {
    const [x, y] = side(1, i / 4);
    ctx.lineTo(x + hr * 0.22, y + hr * 0.1);
    ctx.lineTo(x - hr * 0.08, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (look.hairTint && !flash) {
    ctx.strokeStyle = look.hairTint;
    ctx.lineWidth = Math.max(1.2, r * 0.08);
    for (const k of [-0.7, 0.75]) {
      ctx.beginPath();
      ctx.moveTo(k * hr, hy + hr * 0.3);
      ctx.quadraticCurveTo(k * hr * 1.25, bottom * 0.1, k * hr * 0.9 + drift, bottom - r * 0.08);
      ctx.stroke();
    }
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.2, r * 0.09);
  }
}

function drawWeapon(ctx, kind, r, look) {
  switch (kind) {
    case 'spear':
      ctx.strokeStyle = '#4a3622';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.4, r * 0.62);
      ctx.lineTo(r * 2.0, r * 0.62);
      ctx.stroke();
      ctx.fillStyle = '#b9b6aa';
      ctx.beginPath();
      ctx.moveTo(r * 2.0, r * 0.45);
      ctx.lineTo(r * 2.55, r * 0.62);
      ctx.lineTo(r * 2.0, r * 0.79);
      ctx.fill();
      break;
    case 'bow':
      ctx.strokeStyle = '#4a3622';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(r * 0.35, 0, r * 1.05, -1.05, 1.05);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(241,232,210,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(r * 0.35 + Math.cos(-1.05) * r * 1.05, Math.sin(-1.05) * r * 1.05);
      ctx.lineTo(r * 0.35 + Math.cos(1.05) * r * 1.05, Math.sin(1.05) * r * 1.05);
      ctx.stroke();
      break;
    case 'knife':
      ctx.strokeStyle = '#cfcabb';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(r * 0.5, r * 0.7);
      ctx.lineTo(r * 1.35, r * 0.7);
      ctx.stroke();
      break;
    case 'hook':
      ctx.strokeStyle = '#4a3622';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, r * 0.7);
      ctx.lineTo(r * 1.5, r * 0.7);
      ctx.stroke();
      ctx.strokeStyle = '#b9b6aa';
      ctx.beginPath();
      ctx.arc(r * 1.5, r * 0.4, r * 0.3, Math.PI * 0.5, Math.PI * 1.9);
      ctx.stroke();
      break;
    case 'glaive':
      ctx.strokeStyle = '#3a2c1c';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-r * 0.3, r * 0.65);
      ctx.lineTo(r * 1.9, r * 0.65);
      ctx.stroke();
      ctx.fillStyle = '#9fa3a6';
      ctx.beginPath();
      ctx.moveTo(r * 1.7, r * 0.65);
      ctx.quadraticCurveTo(r * 2.3, r * 0.2, r * 2.5, r * 0.75);
      ctx.lineTo(r * 1.9, r * 0.85);
      ctx.closePath();
      ctx.fill();
      break;
    case 'shield':
      ctx.fillStyle = '#7a3a24';
      ctx.beginPath();
      ctx.ellipse(r * 0.95, 0, r * 0.32, r * 1.05, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#d2ac58';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(r * 1.05, 0, r * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      break;
    case 'greatsword': {
      // 대도: a broad, heavy blade that widens toward a clipped tip.
      const y = r * 0.7;
      // Grip behind the guard.
      ctx.strokeStyle = '#3a2416';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(r * 0.12, y);
      ctx.lineTo(r * 0.5, y);
      ctx.stroke();
      // Blade body.
      ctx.fillStyle = '#d9d7ce';
      ctx.strokeStyle = 'rgba(29, 26, 23, 0.9)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(r * 0.52, y - r * 0.2);
      ctx.lineTo(r * 1.9, y - r * 0.3);
      ctx.quadraticCurveTo(r * 2.35, y - r * 0.3, r * 2.45, y - r * 0.05);
      ctx.lineTo(r * 2.2, y + r * 0.26);
      ctx.lineTo(r * 0.52, y + r * 0.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Thick spine and a shine along the edge.
      ctx.fillStyle = '#9a9890';
      ctx.beginPath();
      ctx.moveTo(r * 0.52, y - r * 0.2);
      ctx.lineTo(r * 1.9, y - r * 0.3);
      ctx.lineTo(r * 1.9, y - r * 0.18);
      ctx.lineTo(r * 0.52, y - r * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(r * 0.7, y + r * 0.13);
      ctx.lineTo(r * 2.05, y + r * 0.18);
      ctx.stroke();
      // Heavy guard.
      ctx.fillStyle = look.trim ?? '#d8b46a';
      ctx.strokeStyle = 'rgba(29, 26, 23, 0.9)';
      ctx.beginPath();
      ctx.roundRect(r * 0.4, y - r * 0.36, r * 0.16, r * 0.72, r * 0.05);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'staff': {
      // 석장: wooden staff topped by a ring hung with small rings.
      ctx.strokeStyle = '#5a3f26';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, r * 0.7);
      ctx.lineTo(r * 1.9, r * 0.7);
      ctx.stroke();
      ctx.strokeStyle = look.trim ?? '#e0b24c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(r * 2.2, r * 0.7, r * 0.34, 0, Math.PI * 2);
      ctx.stroke();
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(r * 2.2, r * 0.7 + k * r * 0.42, r * 0.12, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    case 'sword':
      ctx.strokeStyle = '#dcdbd2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * 0.45, r * 0.68);
      ctx.lineTo(r * 1.85, r * 0.68);
      ctx.stroke();
      ctx.strokeStyle = look.trim ?? '#c9a24a';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * 0.45, r * 0.42);
      ctx.lineTo(r * 0.45, r * 0.94);
      ctx.stroke();
      break;
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.6;
}

/** Head centre sits above the body; everything on it is drawn relative to (0, hy). */
function drawHead(ctx, look, r, flash, sx, back, phase) {
  const hr = r * 0.66;
  const hy = -r * 0.62;
  const fill = (c) => (flash ? HANJI : c);
  const skin = fill(look.skin ?? '#e6c49c');

  // Halo behind the head (궁예).
  if (look.hat === 'monk') {
    ctx.strokeStyle = look.trim ?? '#e0b24c';
    ctx.lineWidth = Math.max(1.5, r * 0.12);
    ctx.globalAlpha *= 0.9;
    ctx.beginPath();
    ctx.arc(0, hy - r * 0.05, hr * 1.35, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha /= 0.9;
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1.2, r * 0.09);
  }
  // Plume streaming up from the helmet (behind the head).
  if (look.hat === 'hero') {
    ctx.fillStyle = fill(look.plume ?? '#b3261e');
    ctx.beginPath();
    ctx.moveTo(0, hy - hr * 0.95);
    ctx.quadraticCurveTo(-sx * hr * 0.9, hy - hr * 1.9 + Math.sin(phase) * r * 0.05, -sx * hr * 1.25, hy - hr * 1.2);
    ctx.quadraticCurveTo(-sx * hr * 0.5, hy - hr * 1.15, 0, hy - hr * 0.8);
    ctx.fill();
    ctx.stroke();
  }

  // The heroes wear their painted faces from the key art; the back view stays drawn.
  const im = !back && look.headImg && headImage(look.headImg);
  if (im) {
    const w = hr * (look.headScale ?? 2.3), h = (w * im.naturalHeight) / im.naturalWidth;
    ctx.save();
    ctx.translate(0, hy - hr * (look.headLift ?? 0.3));
    if (sx < 0) ctx.scale(-1, 1);
    if (flash) ctx.filter = 'brightness(1.8)';
    ctx.drawImage(im, -w / 2, -h / 2, w, h);
    ctx.restore();
    return;
  }

  // Face.
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, hy, hr, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (back) {
    // Back of the head: hair, no face.
    if (!['monk', 'hood', 'hoodBlue', 'pirateBoss'].includes(look.hat)) {
      ctx.fillStyle = fill(look.hair ?? '#2a211b');
      ctx.beginPath();
      ctx.arc(0, hy, hr * 0.92, Math.PI * 0.1, Math.PI * 0.9, true);
      ctx.fill();
    }
  } else {
    drawFace(ctx, look, r, hr, hy, sx, flash);
  }
  drawHat(ctx, look, r, hr, hy, sx, flash, phase);
}

/** Eyes, cheeks and character marks (beard, eyepatch, brows). */
function drawFace(ctx, look, r, hr, hy, sx, flash) {
  const look2 = sx * hr * 0.16; // eyes glance the way the figure faces
  const ey = hy + hr * 0.12;
  const ex = hr * 0.36;
  const eyeR = Math.max(1.3, hr * 0.15);
  // Cheeks.
  if (!flash) {
    ctx.fillStyle = look.blush ?? 'rgba(232, 120, 110, 0.45)';
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(k * hr * 0.55 + look2 * 0.6, ey + hr * 0.3, hr * 0.17, hr * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  for (const k of [-1, 1]) {
    const cx = k * ex + look2;
    // 궁예's patch covers the eye on the side he turns away.
    if (look.eyepatch && k === -sx) {
      ctx.fillStyle = INK;
      ctx.beginPath();
      ctx.ellipse(cx, ey, eyeR * 1.6, eyeR * 1.35, 0, 0, Math.PI * 2);
      ctx.fill();
      if (look.patchTrim && !flash) {
        ctx.strokeStyle = look.patchTrim;
        ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, ey, eyeR * 0.55, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath();
      ctx.moveTo(cx - eyeR * 1.5, ey - eyeR);
      ctx.lineTo(-k * hr * 0.95, hy - hr * 0.45);
      ctx.stroke();
      continue;
    }
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(cx, ey, eyeR, eyeR * 1.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx + eyeR * 0.35, ey - eyeR * 0.45, eyeR * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, r * 0.07);
  if (look.brows) {
    // angry: slanting down to the middle. kind: gentle arches.
    for (const k of [-1, 1]) {
      const cx = k * ex + look2;
      ctx.beginPath();
      if (look.brows === 'angry') {
        ctx.moveTo(cx - k * eyeR * 1.6, ey - eyeR * 2.6);
        ctx.lineTo(cx + k * eyeR * 1.2, ey - eyeR * 1.7);
      } else if (look.brows === 'stern') {
        // Straight, slightly knitted: calm but resolute.
        ctx.moveTo(cx - k * eyeR * 1.5, ey - eyeR * 2.3);
        ctx.lineTo(cx + k * eyeR * 1.2, ey - eyeR * 1.85);
      } else {
        ctx.arc(cx, ey - eyeR * 1.2, eyeR * 1.3, Math.PI * 1.2, Math.PI * 1.8);
      }
      ctx.stroke();
    }
  }
  // Mouth.
  ctx.beginPath();
  if (look.brows === 'angry' || look.brows === 'stern') {
    ctx.moveTo(look2 - hr * 0.12, ey + hr * 0.42);
    ctx.lineTo(look2 + hr * 0.12, ey + hr * 0.38);
  } else {
    ctx.arc(look2, ey + hr * 0.3, hr * 0.12, 0.2, Math.PI - 0.2);
  }
  ctx.stroke();
  if (look.mustache) {
    ctx.strokeStyle = fillOr(flash, look.mustache);
    ctx.lineWidth = Math.max(1.4, r * 0.1);
    ctx.beginPath();
    ctx.moveTo(look2 - hr * 0.3, ey + hr * 0.3);
    ctx.quadraticCurveTo(look2, ey + hr * 0.18, look2 + hr * 0.3, ey + hr * 0.3);
    ctx.stroke();
  }
  if (look.beard) {
    // A full beard around the chin.
    ctx.fillStyle = fillOr(flash, look.beard);
    ctx.beginPath();
    ctx.moveTo(-hr * 0.78, hy + hr * 0.2);
    ctx.quadraticCurveTo(-hr * 0.6, hy + hr * 1.35, look2, hy + hr * 1.45);
    ctx.quadraticCurveTo(hr * 0.6, hy + hr * 1.35, hr * 0.78, hy + hr * 0.2);
    ctx.quadraticCurveTo(hr * 0.4, hy + hr * 0.75, look2, hy + hr * 0.62);
    ctx.quadraticCurveTo(-hr * 0.4, hy + hr * 0.75, -hr * 0.78, hy + hr * 0.2);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.stroke();
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.2, r * 0.09);
}

const fillOr = (flash, c) => (flash ? HANJI : c);

/** Headgear, drawn over the top of the head. */
function drawHat(ctx, look, r, hr, hy, sx, flash, phase) {
  const f = (c) => fillOr(flash, c);
  const dome = (color, cover = 0.15) => {
    ctx.fillStyle = f(color);
    ctx.beginPath();
    ctx.arc(0, hy, hr * 1.04, Math.PI + cover, -cover);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };
  switch (look.hat) {
    case 'helmet':
    case 'helmetBlue': {
      const c = look.hat === 'helmet' ? '#5a4a36' : '#33507a';
      dome(c, 0.05);
      ctx.fillStyle = f(look.hat === 'helmet' ? '#3b3328' : '#24324a');
      ctx.fillRect(-hr * 1.15, hy - hr * 0.1, hr * 2.3, hr * 0.2);
      ctx.strokeRect(-hr * 1.15, hy - hr * 0.1, hr * 2.3, hr * 0.2);
      ctx.fillStyle = f('#b3261e');
      ctx.beginPath();
      ctx.arc(0, hy - hr * 1.05, hr * 0.15, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'hood':
    case 'hoodBlue': {
      ctx.fillStyle = f(look.hat === 'hood' ? look.accent ?? '#3a4a2a' : '#2c4058');
      ctx.beginPath();
      ctx.arc(0, hy, hr * 1.12, Math.PI * 0.72, Math.PI * 0.28);
      ctx.lineTo(hr * 0.55, hy + hr * 0.1);
      ctx.quadraticCurveTo(0, hy - hr * 0.75, -hr * 0.55, hy + hr * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'band': {
      // Messy hair and a red headband with trailing ends.
      ctx.fillStyle = f('#2a211b');
      ctx.beginPath();
      ctx.arc(0, hy, hr * 1.02, Math.PI * 1.05, -Math.PI * 0.05);
      for (let i = 0; i < 5; i++) ctx.lineTo(hr * (0.8 - i * 0.4), hy - hr * (i % 2 ? 0.55 : 0.85));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = f('#c0392b');
      ctx.fillRect(-hr * 1.02, hy - hr * 0.42, hr * 2.04, hr * 0.24);
      ctx.strokeStyle = f('#c0392b');
      ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.beginPath();
      ctx.moveTo(-sx * hr * 0.95, hy - hr * 0.3);
      ctx.quadraticCurveTo(-sx * hr * 1.5, hy - hr * 0.1 + Math.sin(phase) * r * 0.08, -sx * hr * 1.8, hy + hr * 0.2);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.2, r * 0.09);
      break;
    }
    case 'pirateBoss': {
      // Big straw hat.
      ctx.fillStyle = f('#c8a860');
      ctx.beginPath();
      ctx.ellipse(0, hy - hr * 0.45, hr * 1.7, hr * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, hy - hr * 0.75, hr * 0.85, hr * 0.55, 0, Math.PI, 0);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = f('#8a2a1e');
      ctx.fillRect(-hr * 0.85, hy - hr * 0.78, hr * 1.7, hr * 0.18);
      break;
    }
    case 'heavyHelmet': {
      dome('#3c4046', -0.12);
      ctx.strokeStyle = '#9aa0a6';
      ctx.lineWidth = Math.max(1.2, r * 0.08);
      ctx.beginPath();
      ctx.moveTo(0, hy - hr * 1.02);
      ctx.lineTo(0, hy - hr * 0.1);
      ctx.stroke();
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.2, r * 0.09);
      // Cheek guards.
      ctx.fillStyle = f('#4c5157');
      for (const k of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(k * hr * 0.98, hy - hr * 0.1);
        ctx.lineTo(k * hr * 1.08, hy + hr * 0.55);
        ctx.lineTo(k * hr * 0.72, hy + hr * 0.45);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = f('#b3261e');
      ctx.beginPath();
      ctx.moveTo(0, hy - hr * 1.0);
      ctx.lineTo(-hr * 0.18, hy - hr * 1.45);
      ctx.lineTo(hr * 0.18, hy - hr * 1.45);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'crown': {
      // Black topknot hair under a spiky gold crown.
      ctx.fillStyle = f('#1d1a17');
      ctx.beginPath();
      ctx.arc(0, hy, hr * 1.02, Math.PI * 1.05, -Math.PI * 0.05);
      ctx.closePath();
      ctx.fill();
      const gold = f(look.trim ?? '#d8b46a');
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(-hr * 0.85, hy - hr * 0.35);
      for (let i = 0; i <= 4; i++) {
        const xx = -hr * 0.85 + (hr * 1.7 * i) / 4;
        ctx.lineTo(xx, hy - hr * (i % 2 ? 1.05 : 1.5));
        if (i < 4) ctx.lineTo(xx + hr * 0.21, hy - hr * 0.8);
      }
      ctx.lineTo(hr * 0.85, hy - hr * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // Jade drops hanging from the crown.
      ctx.fillStyle = f('#3fae7a');
      for (const k of [-0.5, 0, 0.5]) {
        ctx.beginPath();
        ctx.arc(k * hr, hy - hr * 0.5, hr * 0.1, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'monk': {
      // Shaved head: a shine spot instead of hair.
      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.beginPath();
      ctx.ellipse(-hr * 0.35, hy - hr * 0.55, hr * 0.25, hr * 0.14, -0.5, 0, Math.PI * 2);
      ctx.fill();
      if (look.sunMark) {
        // 궁예: a sun drawn on the forehead.
        const cy = hy - hr * 0.45;
        ctx.strokeStyle = f(look.sunMark);
        ctx.fillStyle = f(look.sunMark);
        ctx.lineWidth = Math.max(1, r * 0.05);
        ctx.beginPath();
        ctx.arc(0, cy, hr * 0.13, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, cy, hr * 0.05, 0, Math.PI * 2);
        ctx.fill();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * hr * 0.19, cy + Math.sin(a) * hr * 0.19);
          ctx.lineTo(Math.cos(a) * hr * 0.27, cy + Math.sin(a) * hr * 0.27);
          ctx.stroke();
        }
        ctx.strokeStyle = INK;
        ctx.lineWidth = Math.max(1.2, r * 0.09);
      } else {
        // A dot of wisdom (백호) on the forehead.
        ctx.fillStyle = f(look.trim ?? '#e0b24c');
        ctx.beginPath();
        ctx.arc(0, hy - hr * 0.3, hr * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      if (look.earrings) {
        // Big gold hoops.
        ctx.strokeStyle = f(look.earrings);
        ctx.lineWidth = Math.max(1.2, r * 0.07);
        for (const k of [-1, 1]) {
          ctx.beginPath();
          ctx.arc(k * hr * 0.98, hy + hr * 0.38, hr * 0.15, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.strokeStyle = INK;
        ctx.lineWidth = Math.max(1.2, r * 0.09);
      }
      break;
    }
    case 'royal': {
      // 왕건: black hair with swept bangs, a topknot and a small gold crown with a blue jewel.
      const hair = f(look.hair ?? '#1a1720');
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.arc(0, hy, hr * 1.05, Math.PI * 1.02, -Math.PI * 0.02);
      // Spiky bangs swept toward the way he faces.
      for (let i = 0; i <= 8; i++) {
        const x = hr * (1.0 - i * 0.25);
        const tip = i % 2 === 1;
        ctx.lineTo(x + (tip ? sx * hr * 0.16 : 0), hy - hr * (tip ? (i === 3 || i === 5 ? -0.05 : 0.12) : 0.42));
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (look.hairTint && !flash) {
        ctx.strokeStyle = look.hairTint;
        ctx.lineWidth = Math.max(1, r * 0.06);
        ctx.beginPath();
        ctx.arc(0, hy, hr * 0.8, Math.PI * 1.25, Math.PI * 1.55);
        ctx.stroke();
        ctx.strokeStyle = INK;
        ctx.lineWidth = Math.max(1.2, r * 0.09);
      }
      // Topknot.
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.arc(0, hy - hr * 1.1, hr * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // Crown around the knot.
      const gold = f(look.trim ?? '#e8c060');
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(-hr * 0.5, hy - hr * 0.82);
      ctx.lineTo(-hr * 0.55, hy - hr * 1.25);
      ctx.lineTo(-hr * 0.25, hy - hr * 1.02);
      ctx.lineTo(0, hy - hr * 1.5);
      ctx.lineTo(hr * 0.25, hy - hr * 1.02);
      ctx.lineTo(hr * 0.55, hy - hr * 1.25);
      ctx.lineTo(hr * 0.5, hy - hr * 0.82);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = f(look.jewel ?? '#2f6fe0');
      ctx.beginPath();
      ctx.moveTo(0, hy - hr * 1.18);
      ctx.lineTo(hr * 0.13, hy - hr * 1.0);
      ctx.lineTo(0, hy - hr * 0.84);
      ctx.lineTo(-hr * 0.13, hy - hr * 1.0);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'warband': {
      // 견훤: a wild mane of hair with a red band and trailing ribbons.
      ctx.fillStyle = f(look.hair ?? '#3a2418');
      ctx.beginPath();
      ctx.arc(0, hy, hr * 1.06, Math.PI * 1.02, -Math.PI * 0.02);
      for (let i = 0; i <= 6; i++) ctx.lineTo(hr * (1.05 - i * 0.35), hy - hr * (i % 2 ? 0.95 : 1.18) + (i === 0 || i === 6 ? hr * 1.1 : 0));
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      const band = f(look.band ?? '#c0392b');
      ctx.fillStyle = band;
      ctx.beginPath();
      ctx.rect(-hr * 1.02, hy - hr * 0.5, hr * 2.04, hr * 0.24);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = f(look.trim ?? '#f0c050');
      ctx.beginPath();
      ctx.arc(0, hy - hr * 0.38, hr * 0.13, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = band;
      ctx.lineWidth = Math.max(1.5, r * 0.11);
      for (const d of [0, 0.25]) {
        ctx.beginPath();
        ctx.moveTo(-sx * hr * 0.95, hy - hr * 0.38);
        ctx.quadraticCurveTo(-sx * hr * 1.5, hy - hr * (0.2 - d) + Math.sin(phase + d * 6) * r * 0.08, -sx * hr * (1.9 - d), hy + hr * (0.2 + d));
        ctx.stroke();
      }
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.2, r * 0.09);
      break;
    }
    case 'hero': {
      dome('#26262c', -0.05);
      ctx.strokeStyle = f(look.trim ?? '#c9a24a');
      ctx.lineWidth = Math.max(1.5, r * 0.12);
      ctx.beginPath();
      ctx.arc(0, hy, hr * 1.04, Math.PI + 0.1, -0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-hr * 1.05, hy - hr * 0.02);
      ctx.lineTo(hr * 1.05, hy - hr * 0.02);
      ctx.stroke();
      ctx.fillStyle = f(look.trim ?? '#c9a24a');
      ctx.beginPath();
      ctx.arc(0, hy - hr * 0.95, hr * 0.17, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.2, r * 0.09);
      break;
    }
  }
}

export function drawCart(ctx, x, y, r, flash) {
  drawShadow(ctx, x, y, r);
  ctx.save();
  ctx.translate(x, y);
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = INK;
  ctx.fillStyle = '#2a2420';
  for (const sx of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(sx * r * 0.95, r * 0.15, r * 0.22, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = flash ? HANJI : '#8b6a3e';
  ctx.fillRect(-r * 0.85, -r * 0.6, r * 1.7, r * 1.2);
  ctx.strokeRect(-r * 0.85, -r * 0.6, r * 1.7, r * 1.2);
  ctx.fillStyle = '#e8dfc6';
  for (const [sx, sy] of [[-0.4, -0.15], [0.35, -0.2], [0, 0.25]]) {
    ctx.beginPath();
    ctx.ellipse(sx * r, sy * r, r * 0.38, r * 0.3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.strokeStyle = '#4a3622';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(r * 0.85, -r * 0.4);
  ctx.lineTo(r * 1.6, -r * 0.55);
  ctx.moveTo(r * 0.85, r * 0.4);
  ctx.lineTo(r * 1.6, r * 0.55);
  ctx.stroke();
  ctx.restore();
}

const COIN = { bronze: '#a8763e', silver: '#c9c6bb', gold: '#e2b84a' };

/** Yeopjeon coin: round with a square hole. */
export function drawCoin(ctx, x, y, tier, t) {
  const r = tier === 'bronze' ? 4.5 : 5.5;
  const bob = Math.sin(t * 5 + x) * 1;
  ctx.fillStyle = COIN[tier];
  ctx.strokeStyle = 'rgba(29,26,23,0.8)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y + bob, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(29,26,23,0.85)';
  ctx.fillRect(x - r * 0.32, y + bob - r * 0.32, r * 0.64, r * 0.64);
}

export function drawRice(ctx, x, y, t) {
  const bob = Math.sin(t * 4) * 1.5;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.fillStyle = 'rgba(244, 226, 150, 0.25)';
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f3efe2';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -9);
  ctx.quadraticCurveTo(10, 6, 7, 7);
  ctx.lineTo(-7, 7);
  ctx.quadraticCurveTo(-10, 6, 0, -9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#26302a';
  ctx.fillRect(-4, 1, 8, 6);
  ctx.restore();
}

export function drawProjectile(ctx, p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  if (p.kind === 'arrow') {
    const ally = p.team === 'player';
    ctx.strokeStyle = ally ? '#2c4058' : '#2a2018';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, 0);
    ctx.lineTo(9, 0);
    ctx.stroke();
    ctx.fillStyle = '#cfcabb';
    ctx.beginPath();
    ctx.moveTo(9, -3);
    ctx.lineTo(14, 0);
    ctx.lineTo(9, 3);
    ctx.fill();
    ctx.strokeStyle = ally ? '#8fb0d0' : '#b3261e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -3);
    ctx.lineTo(-6, 0);
    ctx.lineTo(-10, 3);
    ctx.stroke();
  } else if (p.kind === 'hook') {
    ctx.rotate(p.spin);
    ctx.strokeStyle = '#d2cfc4';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0.3, Math.PI * 1.6);
    ctx.stroke();
    ctx.strokeStyle = '#1d1a17';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (p.kind === 'orb') {
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, p.r * 2);
    glow.addColorStop(0, 'rgba(255, 236, 170, 0.9)');
    glow.addColorStop(1, 'rgba(224, 178, 76, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, p.r * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f6e3a8';
    ctx.strokeStyle = 'rgba(29, 26, 23, 0.7)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, p.r * 0.75, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (p.kind === 'beam') {
    ctx.strokeStyle = 'rgba(240, 210, 130, 0.45)';
    ctx.lineWidth = p.r * 2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-60, 0);
    ctx.lineTo(10, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 248, 220, 0.95)';
    ctx.lineWidth = p.r * 0.7;
    ctx.stroke();
  } else if (p.kind === 'quake') {
    const a = Math.min(1, p.life * 3);
    ctx.fillStyle = `rgba(90, 60, 40, ${0.55 * a})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.r * 1.3, p.r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = `rgba(29, 26, 23, ${0.8 * a})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-p.r * 2.4, 0);
    ctx.lineTo(-p.r * 1.2, -p.r * 0.4);
    ctx.lineTo(-p.r * 0.4, p.r * 0.3);
    ctx.lineTo(p.r * 0.8, -p.r * 0.2);
    ctx.stroke();
  } else if (p.kind === 'pheasant') {
    // 꿩 (장끼): brown body, green neck, red cheek, long barred tail, flapping wings.
    const flap = Math.sin(performance.now() / 45 + (p.flap ?? 0));
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.beginPath();
    ctx.ellipse(-2, 14, 14, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6b4a2a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-8, 0);
    ctx.lineTo(-30, 2);
    ctx.stroke();
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-8 - i * 6, -2);
      ctx.lineTo(-8 - i * 6, 3);
      ctx.stroke();
    }
    ctx.fillStyle = '#a0622e';
    ctx.strokeStyle = '#2a1a10';
    ctx.lineWidth = 1.2;
    for (const k of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(-2, k * (5 + flap * 4), 9, 4, k * (0.4 + flap * 0.3), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#b8743a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#2f6a4a';
    ctx.beginPath();
    ctx.arc(10, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d0302a';
    ctx.beginPath();
    ctx.arc(11, -1.5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8d8a0';
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(18, 1);
    ctx.lineTo(14, 2);
    ctx.fill();
  } else if (p.kind === 'redSlash') {
    // 붉은 검기: a thin upright crescent, glowing red, with a faint trail.
    const a = Math.min(1, p.life * 4);
    const sp = p.span;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(255, 60, 40, 0.18)';
    ctx.beginPath();
    ctx.ellipse(-sp * 0.9, 0, sp * 0.9, sp * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = '#ff2a1a';
    ctx.shadowBlur = p.big ? 18 : 12;
    ctx.fillStyle = p.big ? '#ff3a24' : '#e8321e';
    ctx.beginPath();
    ctx.arc(-sp * 0.9, 0, sp * 1.25, -0.9, 0.9);
    ctx.arc(-sp * 1.2, 0, sp * 1.25, 0.84, -0.84, true);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 214, 200, 0.95)';
    ctx.lineWidth = p.big ? 2.5 : 1.8;
    ctx.beginPath();
    ctx.arc(-sp * 0.95, 0, sp * 1.22, -0.8, 0.8);
    ctx.stroke();
    ctx.globalAlpha = 1;
  } else if (p.kind === 'wave') {
    // 왕건's 검기: a glowing blue-white crescent.
    const a = Math.min(1, p.life * 3);
    ctx.shadowColor = 'rgba(120, 190, 255, 0.9)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = `rgba(200, 230, 255, ${0.9 * a})`;
    ctx.strokeStyle = `rgba(70, 130, 220, ${0.8 * a})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-p.r * 0.6, 0, p.r * 1.2, -1.1, 1.1);
    ctx.arc(-p.r * 1.0, 0, p.r * 1.0, 1.0, -1.0, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawHorse(ctx, color, r, flash, sx, phase) {
  const f = flash ? HANJI : color;
  ctx.save();
  ctx.scale(sx, 1);
  // Legs trotting.
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, r * 0.18);
  for (const [lx, ph] of [[-0.75, 0], [-0.45, Math.PI], [0.5, Math.PI], [0.8, 0]]) {
    const swing = Math.sin(phase + ph) * r * 0.18;
    ctx.beginPath();
    ctx.moveTo(lx * r, r * 0.45);
    ctx.lineTo(lx * r + swing, r * 0.92);
    ctx.stroke();
  }
  ctx.lineWidth = Math.max(1.2, r * 0.09);
  // Tail.
  ctx.strokeStyle = '#1d1a17';
  ctx.lineWidth = Math.max(2, r * 0.16);
  ctx.beginPath();
  ctx.moveTo(-r * 1.05, r * 0.15);
  ctx.quadraticCurveTo(-r * 1.5, r * 0.2 + Math.sin(phase) * r * 0.1, -r * 1.4, r * 0.7);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.2, r * 0.09);
  // Body, neck and head.
  ctx.fillStyle = f;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.3, r * 1.1, r * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(r * 0.6, r * 0.1);
  ctx.lineTo(r * 1.0, -r * 0.45);
  ctx.lineTo(r * 1.3, -r * 0.3);
  ctx.lineTo(r * 1.0, r * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(r * 1.25, -r * 0.45, r * 0.38, r * 0.24, 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // Ear, eye, mane, saddle cloth.
  ctx.beginPath();
  ctx.moveTo(r * 1.0, -r * 0.62);
  ctx.lineTo(r * 1.05, -r * 0.88);
  ctx.lineTo(r * 1.18, -r * 0.65);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(r * 1.28, -r * 0.52, r * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#b3261e';
  ctx.fillRect(-r * 0.45, -r * 0.12, r * 0.9, r * 0.4);
  ctx.strokeRect(-r * 0.45, -r * 0.12, r * 0.9, r * 0.4);
  ctx.restore();
}
