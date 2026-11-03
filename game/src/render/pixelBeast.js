/**
 * 픽셀 짐승: the 영물 (companions) and the four 사신 (also bosses at the altar),
 * drawn as pixel art like the people (render/pixelUnit.js): seen from above at a
 * slant, upright, facing right (flipped to face left), 4 frames of motion, a
 * 1-pixel ink outline. Each kind is a template (four-legged, bird, serpent,
 * turtle) plus what makes it itself. Cached per kind, colours and size.
 *
 * (0, 0) is the spot on the ground under it; flyers hover above their shadow.
 */
import { sheet, toCanvas, silhouette, C, lighten, darken, ball, INK, HANJI } from './pixelUnit.js';
import { SPIRIT_SPRITES } from '../data/spiritSprites.js';

// Drawn sprites (game/assets/spirits/<id>.png, from tools/spirits/import.py) win over the templates below.
const sprites = {};
for (const id of Object.keys(SPIRIT_SPRITES)) {
  const img = new Image();
  img.src = `assets/spirits/${id}.png`;
  sprites[id] = { img, flash: null };
  // 사신 have a finer version for when they are bosses (drawn large).
  if (SPIRIT_SPRITES[id].big) {
    const big = new Image();
    big.src = `assets/spirits/${id}_big.png`;
    sprites[id].big = { img: big, flash: null };
  }
}
/** The 영물 id whose sprite stands for a kind (a 사신 boss's kind maps to its 영물). */
const spriteId = (kind) => ({ dragon: 'cheongnyong', phoenix: 'jujak', tiger: 'baekho', turtle: 'hyeonmu' }[kind] ?? kind);

const TAU = Math.PI * 2;
const W = C('#ffffff');

/** An eye: tiny ones a dark dot with a glint; larger ones (big = its radius) a white, an iris and a glint. */
function eye(p, x, y, big, iris) {
  const r = typeof big === 'number' ? big : big ? 2.2 : 0;
  if (r >= 1.6) {
    p.circle(x, y, r, W);
    p.circle(x + r * 0.25, y + r * 0.15, r * 0.65, iris ?? INK);
    p.circle(x + r * 0.35, y + r * 0.2, Math.max(0.6, r * 0.3), INK);
    p.px(x - r * 0.2, y - r * 0.35, W);
  } else {
    p.rect(x, y - 1, 1, 2, INK);
    p.px(x + 1, y - 1, W);
  }
}

// ---------------------------------------------------------------- four-legged

/**
 * s: { c (coat), belly, dark (paws, nose), bl (body half-length ×R), bh (half-height), leg, lw (leg width px),
 *      head: [x, y, r] (×R, from the body's front top), snout: [len, h], ears: 'point'|'round'|'floppy'|'none',
 *      tail: 'curl'|'brush'|'thin'|'tuft'|'thick'|'none', stripes, chest, tusks, mane, horn, eyeC }
 */
function quad(p, R, f, s) {
  const c = C(s.c), belly = C(s.belly ?? s.c), dark = C(s.dark ?? '#2a2018');
  const leg = s.leg * R, bh = s.bh * R, bl = s.bl * R, cy = -leg - bh * 0.8;
  const step = [0, 1, 0, -1][f] * R * 0.14, bob = f % 2 ? -1 : 0;
  const lw = s.lw ?? Math.max(2, Math.round(R * 0.16));
  const legAt = (x, sw, shade) => {
    // Upper leg joins the body, tapering a little to a rounded paw.
    p.poly([[x - lw * 0.6, cy + bh * 0.3 + bob], [x + lw * 0.6, cy + bh * 0.3 + bob], [x + sw + lw / 2, -1], [x + sw - lw / 2, -1]], shade);
    p.ellipse(x + sw + 0.5, -1, lw * 0.65 + 0.5, Math.max(1, lw * 0.35), s.paw ? C(s.paw) : darken(shade, 0.15));
  };
  // Far legs.
  legAt(bl * 0.62, -step, darken(c, 0.3));
  legAt(-bl * 0.62, step, darken(c, 0.3));
  // Tail.
  const tc = C(s.tailC ?? s.c), tx = -bl * 0.95, ty = cy - bh * 0.3 + bob;
  const wag = [0, 1, 0, -1][f];
  if (s.tail === 'curl') { p.ring(tx - R * 0.12, ty - R * 0.28, R * 0.24, Math.max(2, R * 0.12), tc); }
  else if (s.tail === 'brush') p.poly([[tx + 2, ty - 1], [tx - R * 0.7, ty - R * 0.1 + wag], [tx - R * 0.85, ty + R * 0.25 + wag], [tx - R * 0.2, ty + R * 0.25]], (x) => (s.tailTip && x < tx - R * 0.55 ? C(s.tailTip) : tc));
  else if (s.tail === 'thin') p.line(tx + 1, ty, tx - R * 0.6, ty - R * 0.35 + wag, tc), p.line(tx + 1, ty + 1, tx - R * 0.6, ty - R * 0.34 + wag, tc);
  else if (s.tail === 'tuft') { p.line(tx + 1, ty, tx - R * 0.35, ty + R * 0.2, tc); ball(p, tx - R * 0.4, ty + R * 0.25 + wag, R * 0.12, C(s.tailTip ?? s.c)); }
  else if (s.tail === 'thick') p.poly([[tx + 2, ty - R * 0.1], [tx - R * 0.6, ty + R * 0.1 + wag], [tx - R * 0.55, ty + R * 0.25 + wag], [tx + 2, ty + R * 0.2]], tc);
  else if (s.tail === 'long') {
    for (let i = 0; i < 8; i++) {
      const u = i / 7;
      p.circle(tx - u * R * 0.9, ty - Math.sin(u * 3 + f) * R * 0.25 - u * R * 0.2, Math.max(1, R * 0.08), u > 0.75 && s.tailTip ? C(s.tailTip) : tc);
    }
  }
  // Body: lit back, belly lower.
  p.ellipse(0, cy + bob, bl, bh, (d, a) => {
    const y = Math.sin(a) * d;
    if (y > 0.45) return belly;
    if (y < -0.55 && d > 0.6) return lighten(c, 0.18);
    return c;
  });
  if (s.mane) for (let i = 0; i < 6; i++) ball(p, bl * 0.55 + (i % 3) * R * 0.08, cy - bh * 0.6 + Math.floor(i / 3) * R * 0.2 + bob, R * 0.2, C(s.mane), 0.12, 0.2);
  if (s.stripes)
    for (let i = -2; i <= 2; i++) {
      const x = i * bl * 0.32;
      p.line(x, cy - bh + 1 + bob, x - R * 0.06, cy - bh * 0.15 + bob, C(s.stripes));
      p.line(x + 1, cy - bh + 1 + bob, x - R * 0.05, cy - bh * 0.3 + bob, C(s.stripes));
    }
  if (s.saddle) {
    p.rect(-bl * 0.45, cy - bh * 0.95 + bob, bl * 0.9, bh * 1.2, C(s.saddle));
    p.line(-bl * 0.45, cy + bh * 0.25 + bob, bl * 0.45, cy + bh * 0.25 + bob, C(s.saddleTrim ?? '#e0b24c'));
  }
  // Near legs.
  legAt(bl * 0.5, step, c);
  legAt(-bl * 0.72, -step, c);
  // Head.
  const [hx, hy, hrr] = s.head, HX = bl * 0.85 + hx * R, HY = cy - bh * 0.35 + hy * R + bob, hr = hrr * R;
  if (s.ears === 'point') for (const k of [-1, 1]) p.tri(HX + k * hr * 0.45 - hr * 0.3, HY - hr * 0.6, HX + k * hr * 0.45 + hr * 0.3, HY - hr * 0.6, HX + k * hr * 0.45, HY - hr * 1.45, k > 0 ? c : darken(c, 0.2));
  if (s.ears === 'round') for (const k of [-1, 1]) ball(p, HX + k * hr * 0.55, HY - hr * 0.7, hr * 0.32, k > 0 ? c : darken(c, 0.2));
  if (s.mane2) for (let i = 0; i < 7; i++) { const g = Math.PI * (0.55 + i * 0.22); ball(p, HX + Math.cos(g) * hr * 1.0, HY + Math.sin(g) * hr * 1.0, hr * 0.38, C(s.mane2), 0.15, 0.2); }
  ball(p, HX, HY, hr, c, 0.15, 0.15);
  if (s.ears === 'floppy') p.poly([[HX - hr * 0.2, HY - hr * 0.7], [HX - hr * 0.95, HY - hr * 0.3], [HX - hr * 0.8, HY + hr * 0.35]], darken(c, 0.25));
  if (s.chest) p.arc(bl * 0.75, cy - bh * 0.1 + bob, R * 0.28, 2, Math.PI * 0.15, Math.PI * 0.85, C(s.chest));
  const [sl, sh] = s.snout ?? [0.4, 0.45];
  p.ellipse(HX + hr * 0.75, HY + hr * 0.2, hr * sl * 1.4, hr * sh, C(s.muzzle ?? s.belly ?? s.c));
  p.rect(HX + hr * (0.75 + sl * 1.3) - 1, HY + hr * 0.05, 2, 2, dark);
  if (s.tusks) p.line(HX + hr * 0.9, HY + hr * 0.45, HX + hr * 1.1, HY + hr * 0.05, W);
  if (s.horn) p.tri(HX - 1, HY - hr * 0.8, HX + 2, HY - hr * 0.8, HX + hr * 0.2, HY - hr * 1.6, C(s.horn));
  if (s.trunk) {
    for (let i = 0; i < 6; i++) p.circle(HX + hr * 0.9 + i * R * 0.05, HY + hr * 0.3 + i * R * 0.09 - (f % 2 ? 0 : i * 0.3), Math.max(1.5, hr * 0.28 - i * 0.4), c);
    p.line(HX + hr * 0.6, HY + hr * 0.5, HX + hr * 1.15, HY + hr * 0.75, W);
    ball(p, HX - hr * 0.35, HY + hr * 0.05, hr * 0.7, darken(c, 0.12), 0.05, 0.2); // the big ear
  }
  if (s.stripes) for (const k of [-0.3, 0.1]) p.line(HX + k * hr, HY - hr * 0.9, HX + k * hr + 1, HY - hr * 0.45, C(s.stripes));
  if (s.bell) { ball(p, bl * 0.8, cy + bh * 0.4 + bob, Math.max(1.5, R * 0.1), C(s.bell), 0.4, 0.2); }
  eye(p, HX + hr * 0.25, HY - hr * 0.15, hr > 7 ? hr * 0.2 : false, s.eyeC ? C(s.eyeC) : null);
  // Big cats: a nose and a mouth on the muzzle.
  if (s.stripes && hr > 7) {
    p.rect(HX + hr * 1.05, HY + hr * 0.1, Math.max(2, hr * 0.15), Math.max(2, hr * 0.12), C('#d07080'));
    p.line(HX + hr * 1.1, HY + hr * 0.35, HX + hr * 0.85, HY + hr * 0.45, dark);
  }
}

// ---------------------------------------------------------------- birds

/** s: { c, wing, belly, beak, tail: 'fan'|'fork'|'long'|'plume', crest, legs: n, flame, size } */
function bird(p, R, f, s) {
  const c = C(s.c), wing = C(s.wing ?? s.c), belly = C(s.belly ?? s.c);
  const z = R * (s.z ?? 1.3) + [0, -1, -2, -1][f];
  // Shadow on the floor.
  p.disc(0, 0, R * 0.55, C('#16130f'), 0.3);
  const cy = -z, bl = R * (s.bl ?? 0.55), bh = R * (s.bh ?? 0.38);
  const flap = [1, 0, -1, 0][f]; // wings up, level, down, level
  // Tail.
  const tc = C(s.tailC ?? s.wing ?? s.c);
  if (s.tail === 'fork') { p.tri(-bl * 0.8, cy, -bl * 1.6, cy - R * 0.3, -bl * 1.3, cy + R * 0.05, tc); p.tri(-bl * 0.8, cy, -bl * 1.6, cy + R * 0.3, -bl * 1.3, cy + R * 0.05, tc); }
  else if (s.tail === 'long' || s.tail === 'plume') {
    const n = s.tail === 'plume' ? 3 : 1;
    for (let k = 0; k < n; k++)
      for (let i = 0; i < 12; i++) {
        const u = i / 11, x = -bl * 0.7 - u * R * (1.6 + k * 0.3), y = cy + Math.sin(u * 4 + f * 1.5 + k) * R * 0.18 + (k - 1) * u * R * 0.3;
        const col = s.flame ? [C('#fff2a8'), C('#ffd04a'), C('#ff9a2a'), C('#e0503a'), C('#a8241c')][Math.min(4, Math.floor(u * 5))] : tc;
        p.circle(x, y, Math.max(1, R * (0.14 - u * 0.08)), col);
      }
  } else p.poly([[-bl * 0.7, cy - R * 0.08], [-bl * 1.45, cy - R * 0.2], [-bl * 1.45, cy + R * 0.18], [-bl * 0.7, cy + R * 0.1]], tc);
  // Far wing.
  const wingPts = (k) => {
    const tip = flap * R * 0.9 * k, back = -bl * 0.6;
    return [[bl * 0.25, cy - R * 0.05], [back, cy - R * 0.1], [back - R * 0.7, cy - tip - R * 0.15], [bl * 0.1 - R * 0.2, cy - tip * 0.8 - R * 0.1]];
  };
  p.poly(wingPts(1), darken(wing, 0.25));
  if (s.legs) for (let i = 0; i < s.legs; i++) p.line(-R * 0.1 + i * R * 0.12, cy + bh * 0.8, -R * 0.18 + i * R * 0.12, cy + bh * 0.8 + R * 0.35, C(s.legC ?? '#e0a830'));
  // Body.
  p.ellipse(0, cy, bl, bh, (d, a) => (Math.sin(a) * d > 0.35 ? belly : Math.sin(a) * d < -0.5 && d > 0.6 ? lighten(c, 0.18) : c));
  // Head and beak.
  const HX = bl * 0.85, HY = cy - bh * 0.75, hr = R * (s.hr ?? 0.3);
  ball(p, HX, HY, hr, c, 0.15, 0.1);
  if (s.mask) p.circle(HX + hr * 0.15, HY, hr * 0.7, C(s.mask));
  if (s.crest) for (let i = 0; i < 3; i++) p.line(HX - hr * 0.2, HY - hr * 0.7, HX - hr * (0.6 + i * 0.3), HY - hr * (1.6 - i * 0.2), C(s.crest));
  if (s.crown) p.rect(HX - 1, HY - hr - 1, 3, 2, C(s.crown));
  if (s.hooked) p.poly([[HX + hr * 0.75, HY - hr * 0.3], [HX + hr * 1.45, HY], [HX + hr * 1.2, HY + hr * 0.45], [HX + hr * 0.75, HY + hr * 0.25]], C(s.beak ?? '#e0a830'));
  else p.tri(HX + hr * 0.8, HY - hr * 0.25, HX + hr * 0.8, HY + hr * 0.3, HX + hr * (s.longBeak ? 2.6 : 1.6), HY + hr * 0.1, C(s.beak ?? '#e0a830'));
  eye(p, HX + hr * 0.3, HY - hr * 0.1, hr > 6 ? hr * 0.22 : false, s.eyeC ? C(s.eyeC) : null);
  if (s.ears) for (const k of [-0.4, 0.3]) p.tri(HX + k * hr - 2, HY - hr * 0.6, HX + k * hr + 2, HY - hr * 0.6, HX + k * hr, HY - hr * 1.3, darken(c, 0.2));
  // Near wing over the body.
  p.poly(wingPts(1.05).map(([x, y]) => [x + R * 0.05, y + R * 0.08]), (x) => (x < -bl * 0.9 && s.wingTip ? C(s.wingTip) : wing));
  if (s.flame) p.glow?.(0, cy, R * 1.2, C('#ff9a2a'), 0.25);
}

// ---------------------------------------------------------------- serpents

/** A body made of discs along a wave from the tail (left) to the head (right). */
function serpent(p, R, f, s) {
  const c = C(s.c), belly = C(s.belly ?? s.c), n = s.n ?? 16, L = R * (s.len ?? 2.2), th = R * (s.th ?? 0.22);
  const z = R * (s.z ?? 0), ph = f * (TAU / 4);
  if (s.z) p.disc(0, 0, R * 0.8, C('#16130f'), 0.3);
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = -L / 2 + u * L, y = -z - th - Math.sin(u * (s.waves ?? 2.2) * Math.PI - ph) * R * (s.amp ?? 0.22) * (0.4 + 0.6 * u) - (s.rise ? u * u * R * s.rise : 0);
    pts.push([x, y, th * (s.taper === false ? 1 : 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, u * 1.05 + 0.08)))]);
  }
  for (const [x, y, t] of pts) p.circle(x, y, t, (d, a) => (Math.sin(a) * d > 0.4 ? belly : Math.sin(a) * d < -0.5 ? lighten(c, 0.15) : c));
  if (s.segments) for (let i = 1; i < pts.length; i += 2) p.line(pts[i][0], pts[i][1] - pts[i][2] + 1, pts[i][0], pts[i][1] + pts[i][2] - 1, darken(c, 0.2));
  if (s.spine) for (let i = 2; i < pts.length - 2; i += 2) p.tri(pts[i][0] - 1.5, pts[i][1] - pts[i][2] + 1, pts[i][0] + 1.5, pts[i][1] - pts[i][2] + 1, pts[i][0], pts[i][1] - pts[i][2] - R * 0.15, C(s.spine));
  const [hx, hy] = pts[n];
  return { hx, hy, pts };
}

// ---------------------------------------------------------------- the kinds

const KINDS = {
  // 범수
  jindo: (p, R, f) => quad(p, R, f, { c: '#efe2c4', belly: '#fbf4e2', dark: '#3a2a20', bl: 0.62, bh: 0.32, leg: 0.42, head: [0.1, -0.2, 0.36], ears: 'point', tail: 'curl', tailC: '#e6d4ae', snout: [0.38, 0.42] }),
  crow: (p, R, f) => bird(p, R, f, { c: '#22202a', wing: '#2c2a38', belly: '#2a2832', beak: '#3a3a40', tail: 'fan', eyeC: '#d04030' }),
  otter: (p, R, f) => quad(p, R, f, { c: '#7a5232', belly: '#c8a47a', bl: 0.72, bh: 0.26, leg: 0.22, head: [0.05, -0.05, 0.3], ears: 'round', tail: 'thick', tailC: '#6a4428', snout: [0.32, 0.38], muzzle: '#d8bc94' }),
  gull: (p, R, f) => bird(p, R, f, { c: '#f2f2ee', wing: '#b8c0c8', wingTip: '#2a2a30', belly: '#ffffff', beak: '#f0c030', tail: 'fan', tailC: '#e8e8e4' }),
  boar: (p, R, f) => quad(p, R, f, { c: '#4a3428', belly: '#5e4636', dark: '#1d1410', bl: 0.66, bh: 0.38, leg: 0.3, head: [0.15, 0.05, 0.36], ears: 'point', tail: 'thin', tusks: true, snout: [0.42, 0.36], muzzle: '#8a6a58', mane: '#2e1e16' }),
  bat: (p, R, f) => bird(p, R, f, { c: '#4a3a5a', wing: '#5a4270', wingTip: '#3a2a48', belly: '#6a5a78', beak: '#c890a0', tail: 'fan', tailC: '#4a3a5a', ears: true, eyeC: '#ff4060', hr: 0.32, bl: 0.4, z: 1.5 }),
  // 영수
  falcon: (p, R, f) => bird(p, R, f, { c: '#5a6a7a', wing: '#4a5a6a', wingTip: '#2a3440', belly: '#e8e4d8', beak: '#e0b030', hooked: true, tail: 'fan', tailC: '#4a5a6a', eyeC: '#f0c030', mask: '#3a4450' }),
  fox: (p, R, f) => quad(p, R, f, { c: '#d8742a', belly: '#f6eadc', dark: '#2a1a12', bl: 0.6, bh: 0.28, leg: 0.36, head: [0.12, -0.18, 0.34], ears: 'point', tail: 'brush', tailC: '#d8742a', tailTip: '#f6eadc', snout: [0.5, 0.3], muzzle: '#f6eadc' }),
  snake: (p, R, f) => {
    const { hx, hy } = serpent(p, R, f, { c: '#8a8a2a', belly: '#d8d080', len: 2.4, th: 0.2, amp: 0.3, segments: true });
    ball(p, hx + 2, hy - 1, R * 0.26, C('#8a8a2a'), 0.2, 0.15);
    eye(p, hx + 3, hy - 3, false);
    p.line(hx + R * 0.25, hy, hx + R * 0.45, hy + (f % 2 ? -2 : 2), C('#d04040'));
  },
  bear: (p, R, f) => quad(p, R, f, { c: '#2a2422', belly: '#3a322e', dark: '#141010', bl: 0.66, bh: 0.44, leg: 0.32, lw: Math.round(R * 0.24), head: [0.1, -0.15, 0.4], ears: 'round', tail: 'none', snout: [0.36, 0.38], muzzle: '#8a6a50', chest: '#f4f0e6' }),
  owl: (p, R, f) => bird(p, R, f, { c: '#8a6a44', wing: '#7a5a38', wingTip: '#4a3420', belly: '#e0cca4', beak: '#3a2a1a', tail: 'fan', ears: true, hr: 0.42, bl: 0.42, bh: 0.45, eyeC: '#f0a020', z: 1.2 }),
  wolf: (p, R, f) => quad(p, R, f, { c: '#8a8e98', belly: '#d4d6dc', dark: '#22242a', bl: 0.66, bh: 0.32, leg: 0.42, head: [0.12, -0.18, 0.36], ears: 'point', tail: 'brush', tailC: '#7a7e88', tailTip: '#4a4e58', snout: [0.52, 0.32], muzzle: '#d4d6dc', eyeC: '#f0c040' }),
  // 서수
  crane: (p, R, f) => {
    // 학: stands tall on thin legs, a long neck, red crown, black neck and tail.
    const stepL = [0, 1, 0, -1][f] * R * 0.12;
    for (const [x, s] of [[-R * 0.1, stepL], [R * 0.1, -stepL]]) p.line(x, -R * 0.9, x + s, 0, C('#3a3a3a'));
    p.ellipse(0, -R * 1.05, R * 0.55, R * 0.32, (d, a) => (Math.cos(a) < -0.6 && d > 0.5 ? C('#1d1a17') : C('#f8f8f4')));
    for (let i = 0; i < 8; i++) { const u = i / 7; p.circle(R * 0.35 + u * R * 0.25, -R * 1.1 - u * R * 0.75, Math.max(1, R * 0.08), u < 0.75 ? C('#22202a') : C('#f8f8f4')); }
    ball(p, R * 0.62, -R * 1.9, R * 0.17, C('#f8f8f4'), 0.1, 0.1);
    p.rect(R * 0.55, -R * 2.06, 3, 2, C('#d82a2a'));
    p.tri(R * 0.75, -R * 1.93, R * 0.75, -R * 1.85, R * 1.15, -R * 1.86, C('#d8b060'));
    eye(p, R * 0.65, -R * 1.92, false);
  },
  worm: (p, R, f) => {
    // 대지렁이: rears up out of a hole in the ground.
    p.ellipse(0, 0, R * 0.6, R * 0.22, C('#2a2018'));
    const { hx, hy } = serpent(p, R, f, { c: '#c87a7a', belly: '#e0a0a0', len: 0.9, th: 0.24, amp: 0.15, rise: 1.4, segments: true, taper: false, n: 12 });
    ball(p, hx, hy, R * 0.26, C('#d88a8a'), 0.2, 0.15);
    p.ring(hx + R * 0.1, hy, R * 0.12, 2, C('#6a2a2a'));
  },
  cub: (p, R, f) => quad(p, R, f, { c: '#e8902a', belly: '#f8ecd8', dark: '#2a1a12', bl: 0.5, bh: 0.3, leg: 0.3, head: [0.05, -0.15, 0.42], ears: 'round', tail: 'long', tailC: '#e8902a', tailTip: '#2a1a12', stripes: '#2a1a12', snout: [0.32, 0.36], muzzle: '#f8ecd8' }),
  tiger: (p, R, f) => quad(p, R, f, { c: '#e8902a', belly: '#f8ecd8', dark: '#2a1a12', bl: 0.7, bh: 0.34, leg: 0.4, head: [0.1, -0.15, 0.38], ears: 'round', tail: 'long', tailC: '#e8902a', tailTip: '#2a1a12', stripes: '#2a1a12', snout: [0.36, 0.36], muzzle: '#f8ecd8' }),
  turtle: (p, R, f, pal = {}) => {
    // 바다거북: a domed shell with plates, flippers paddling.
    const sh = C(pal.shell ?? '#4a7a4a'), skin = C(pal.skin ?? '#8ab07a'), fl = [1, 0, -1, 0][f] * R * 0.12;
    for (const [x, y, k] of [[R * 0.45, -R * 0.15, 1], [-R * 0.45, -R * 0.15, -1]]) p.ellipse(x + fl * k, y, R * 0.28, R * 0.12, darken(skin, 0.2));
    ball(p, R * 0.78, -R * 0.38, R * 0.24, skin, 0.15, 0.15);
    eye(p, R * 0.85, -R * 0.44, false);
    p.ellipse(0, -R * 0.38, R * 0.7, R * 0.42, (d, a) => (Math.sin(a) * d < -0.5 && d > 0.55 ? lighten(sh, 0.2) : d > 0.85 ? darken(sh, 0.3) : sh));
    for (const [x, y] of [[0, -0.5], [-0.32, -0.42], [0.32, -0.42], [-0.15, -0.25], [0.18, -0.25]]) p.ring(x * R, y * R, R * 0.13, 1, darken(sh, 0.3));
    for (const [x, y] of [[R * 0.4, -R * 0.02], [-R * 0.4, -R * 0.02]]) p.ellipse(x - fl, y, R * 0.22, R * 0.1, skin);
  },
  samjogo: (p, R, f) => {
    // 삼족오: the three-legged crow inside a burning sun.
    const z = R * 1.4 + [0, -1, -2, -1][f];
    p.disc(0, 0, R * 0.5, C('#16130f'), 0.3);
    p.circle(0, -z, R * 0.95, (d) => (d > 0.85 ? C('#ff8a2a') : d > 0.6 ? C('#ffc040') : C('#ffe27a')));
    for (let i = 0; i < 12; i++) { const g = (i / 12) * TAU + f * 0.13; p.line(Math.cos(g) * R * 1.0, -z + Math.sin(g) * R * 1.0, Math.cos(g) * R * 1.25, -z + Math.sin(g) * R * 1.25, C('#ffb030')); }
    bird(p, R * 0.75, f, { c: '#1d1a24', wing: '#2a2632', belly: '#24202c', beak: '#3a3438', tail: 'fan', legs: 3, legC: '#1d1a24', z: z / (R * 0.75) - 0.3 });
  },
  // 신수
  dragonmaid: (p, R, f) => {
    // 용녀: a sea-dragon maiden: a teal scaled tail curling on the floor, a girl in white with small horns.
    const { pts } = serpent(p, R, f, { c: '#2a9a9a', belly: '#9ae0d0', len: 1.6, th: 0.2, amp: 0.15, waves: 1.4, segments: true });
    const [bx, by] = pts[pts.length - 1];
    p.tri(pts[0][0], pts[0][1], pts[0][0] - R * 0.4, pts[0][1] - R * 0.3 + (f % 2), pts[0][0] - R * 0.35, pts[0][1] + R * 0.2, C('#5ac8c0'));
    p.poly([[bx - R * 0.25, by], [bx + R * 0.25, by], [bx + R * 0.18, by - R * 0.6], [bx - R * 0.18, by - R * 0.6]], C('#f4f2ea'));
    p.line(bx - R * 0.2, by - R * 0.25, bx + R * 0.2, by - R * 0.25, C('#2a9a9a'));
    const HY = by - R * 0.85;
    p.poly([[bx - R * 0.32, HY - R * 0.1], [bx + R * 0.28, HY - R * 0.1], [bx + R * 0.25, by - R * 0.3], [bx - R * 0.4, by - R * 0.2 + (f % 2)]], C('#1a3a5a'));
    ball(p, bx, HY, R * 0.27, C('#f6dcc0'), 0.1, 0.12);
    p.circle(bx - R * 0.05, HY - R * 0.12, R * 0.25, (d, a) => (Math.sin(a) < 0 ? C('#1a3a5a') : 0));
    for (const k of [-1, 1]) p.line(bx + k * R * 0.12, HY - R * 0.25, bx + k * R * 0.2, HY - R * 0.45, C('#e0c070'));
    eye(p, bx + R * 0.08, HY, false);
    p.px(bx + R * 0.2, HY + R * 0.08, C('#e8786e'));
  },
  elephant: (p, R, f) => quad(p, R, f, { c: '#e8e4dc', belly: '#d8d2c6', dark: '#8a8478', bl: 0.75, bh: 0.48, leg: 0.4, lw: Math.round(R * 0.26), head: [0.12, -0.05, 0.42], ears: 'none', tail: 'thin', tailC: '#b8b2a6', snout: [0.1, 0.1], trunk: true, saddle: '#b3261e', saddleTrim: '#e0b24c' }),
  haetae: (p, R, f) => quad(p, R, f, { c: '#c8a24a', belly: '#e8d090', dark: '#3a2a10', bl: 0.6, bh: 0.36, leg: 0.36, lw: Math.round(R * 0.2), head: [0.1, -0.2, 0.36], ears: 'round', tail: 'tuft', tailTip: '#2a8a7a', mane2: '#2a8a7a', horn: '#f6e7b0', bell: '#f0c040', snout: [0.36, 0.4], muzzle: '#e8d090', eyeC: '#2a8a7a' }),
  // 사신
  dragon: (p, R, f, pal = {}) => {
    // 청룡: a long scaled body rippling in the air, a ridge of fins, horns and whiskers, small claws.
    const c = pal.body ?? '#3fae7a', belly = pal.trim ?? '#f2d27a';
    const { hx, hy, pts } = serpent(p, R, f, { c, belly, len: 2.8, th: 0.22, amp: 0.32, z: 0.9, segments: true, spine: pal.accent ?? '#1d5a44', n: 22 });
    for (const i of [6, 15]) {
      const [x, y, t] = pts[i];
      p.line(x, y + t, x + R * 0.12, y + t + R * 0.25, C(c));
      p.line(x + R * 0.12, y + t + R * 0.25, x + R * 0.22, y + t + R * 0.25, C(belly));
    }
    const hr = R * 0.32;
    ball(p, hx + R * 0.15, hy - R * 0.08, hr, C(c), 0.18, 0.15);
    p.ellipse(hx + R * 0.45, hy, hr * 0.85, hr * 0.5, C(c));
    p.line(hx + R * 0.3, hy + hr * 0.35, hx + R * 0.68, hy + hr * 0.2, darken(C(c), 0.4));
    for (const k of [0, 1]) p.line(hx + R * 0.05 + k * 3, hy - hr * 0.8, hx - R * 0.25 + k * 3, hy - hr * 1.9, C('#f6e7b0'));
    for (const k of [-1, 1]) p.line(hx + R * 0.65, hy + 1, hx + R * 1.05, hy + k * R * 0.2 + (f % 2) * k, C(belly));
    p.poly([[hx - R * 0.05, hy - hr * 0.5], [hx - R * 0.45, hy - hr * 0.2], [hx - R * 0.35, hy + hr * 0.5]], C(pal.accent ?? '#1d5a44'));
    eye(p, hx + R * 0.22, hy - R * 0.14, Math.max(2.2, R * 0.08), C('#f0c040'));
    ball(p, hx + R * 0.95, hy + R * 0.35, R * 0.12, C('#e8f4ff'), 0.4, 0.1); // the pearl
  },
  phoenix: (p, R, f, pal = {}) => bird(p, R, f, { c: pal.body ?? '#e0503a', wing: pal.body ?? '#e0503a', wingTip: pal.trim ?? '#ffcf5a', belly: pal.trim ?? '#ffcf5a', beak: '#f0c030', tail: 'plume', flame: true, crest: pal.trim ?? '#ffcf5a', eyeC: '#ffcf5a', hr: 0.3, bl: 0.6, bh: 0.4, z: 1.4 }),
  baekho: (p, R, f, pal = {}) => quad(p, R, f, { c: pal.body ?? '#eef0f4', belly: '#ffffff', dark: '#24242c', bl: 0.72, bh: 0.36, leg: 0.42, lw: Math.round(R * 0.2), head: [0.1, -0.15, 0.4], ears: 'round', tail: 'long', tailC: pal.body ?? '#eef0f4', tailTip: pal.accent ?? '#24242c', stripes: pal.accent ?? '#24242c', snout: [0.36, 0.38], muzzle: '#ffffff', eyeC: pal.trim ?? '#7ad0ff' }),
  hyeonmu: (p, R, f, pal = {}) => {
    // 현무: a black tortoise with a snake wound round its shell, its head raised over it.
    KINDS.turtle(p, R, f, { shell: pal.body ?? '#2a3450', skin: pal.accent ?? '#4a5a8a' });
    const { hx, hy } = serpent(p, R * 0.9, f, { c: pal.trim ?? '#7ad8a0', belly: '#d8f0c8', len: 1.5, th: 0.12, amp: 0.2, rise: 0.9, z: 0.35, segments: true });
    ball(p, hx, hy, R * 0.15, C(pal.trim ?? '#7ad8a0'), 0.2, 0.1);
    eye(p, hx + 1, hy - 2, false);
  },
};
KINDS.cheongnyong = KINDS.dragon;
KINDS.jujak = KINDS.phoenix;
KINDS.turtleBoss = KINDS.hyeonmu;
const FLYERS = new Set(['crow', 'gull', 'bat', 'falcon', 'owl', 'samjogo', 'dragon', 'cheongnyong', 'phoenix', 'jujak']);

/** Kind for a 사신 boss's look.beast (dragon, phoenix, tiger, turtle). 영물 use their own id as the kind. */
export const bossKind = (beast) => ({ tiger: 'baekho', turtle: 'hyeonmu' }[beast] ?? beast);

// ---------------------------------------------------------------- cache + draw

const cache = new Map();

function framesFor(kind, R, pal) {
  const key = `${kind}|${Math.round(R * 2)}|${pal ? JSON.stringify(pal) : ''}`;
  let set = cache.get(key);
  if (set) return set;
  const w = Math.ceil(R * 6.4) + 10, h = Math.ceil(R * 5) + 10, ox = Math.ceil(w / 2), oy = Math.ceil(R * 3.6) + 6;
  const frames = [];
  for (let f = 0; f < 4; f++) {
    const s = sheet(w, h, ox, oy);
    KINDS[kind](s.p, R, f, pal ?? {});
    frames.push(toCanvas(s));
  }
  set = { frames, flash: [], ox, oy };
  cache.set(key, set);
  return set;
}

/**
 * Draws a creature of `kind` with its ground spot at (x, y). R is its size
 * (roughly the body's half-length); facing right unless `left`; t (seconds)
 * drives its 4-frame motion; pal recolours a 사신 boss (its look's body/accent/trim).
 */
export function drawPixelBeast(ctx, kind, x, y, R, left, t, o = {}) {
  let sp = sprites[spriteId(kind)];
  // Big on screen (a boss): the finer version when there is one.
  if (sp?.big && R > 20 && sp.big.img.complete && sp.big.img.naturalWidth) sp = sp.big;
  if (sp?.img.complete && sp.img.naturalWidth) return drawSprite(ctx, sp, kind, x, y, R, left, t, o);
  if (!KINDS[kind]) return false;
  const set = framesFor(kind, R, o.pal);
  const f = Math.floor(t * (o.fps ?? 8)) % 4;
  let cv = set.frames[f];
  if (o.flash) cv = set.flash[f] ??= silhouette(cv, HANJI);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  ctx.translate(Math.round(x), Math.round(y));
  if (left) ctx.scale(-1, 1);
  ctx.drawImage(cv, -set.ox, -set.oy);
  ctx.restore();
  return true;
}

/**
 * A drawn sprite, its feet on (x, y) (flyers hover above), about 3R across at
 * its longest side; it hops on the step, flyers rise and fall.
 */
function drawSprite(ctx, sp, kind, x, y, R, left, t, o) {
  const img = sp.img, k = (R * 3) / Math.max(img.naturalWidth, img.naturalHeight);
  const fly = FLYERS.has(kind);
  const lift = fly ? R * 1.1 + Math.sin(t * 5) * R * 0.12 : Math.abs(Math.sin(t * 9)) * R * 0.08;
  let src = img;
  if (o.flash) src = sp.flash ??= silhouette(toImageCanvas(img), HANJI);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (o.alpha !== undefined) ctx.globalAlpha *= o.alpha;
  if (fly) {
    // Its shadow stays on the floor.
    ctx.fillStyle = 'rgba(22, 19, 15, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, y, R * 0.8, R * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.translate(Math.round(x), Math.round(y - lift));
  if (left) ctx.scale(-1, 1);
  ctx.scale(k, k);
  ctx.drawImage(src, -img.naturalWidth / 2, -img.naturalHeight);
  ctx.restore();
  return true;
}

function toImageCanvas(img) {
  const c = document.createElement('canvas');
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  c.getContext('2d').drawImage(img, 0, 0);
  return c;
}

/** URL of a 영물's drawn sprite, if it has one. */
export const spriteUrl = (id) => (SPIRIT_SPRITES[id] ? `assets/spirits/${id}.png` : null);

export const isFlyer = (kind) => FLYERS.has(kind);
export const BEAST_KINDS = Object.keys(KINDS);
