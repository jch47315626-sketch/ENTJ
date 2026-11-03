/**
 * 픽셀 인물: every person on the field (heroes, allies, soldiers, generals)
 * drawn as pixel art, generated from the same `look` data the old path
 * drawing used (body colour, hat, weapon, mount, beard, the three hero models…).
 *
 * Seen like the field: from above at a slant, upright, chibi. Each look is drawn
 * once per size into small canvases with pixelfx's painter (1 pixel = 1 world
 * unit at the unit's size) and cached:
 *   body  front and back × 4 walk frames (feet patter), facing right
 *   flash the same as a white silhouette (hit flash)
 *   weapon held in the hand, drawn turned to the aim like before
 *   horse 4 gallop frames under a mounted rider
 * A 1-pixel ink outline is put round every silhouette.
 */
import { createFrame, composite, painterFor } from '../vendor/pixelfx/fx.js';
import { mix } from '../vendor/pixelfx/color.js';

const INK = 0xff171a1d; // #1d1a17 as ABGR
const HANJI = '#f1e8d2';

/** CSS colour (#rgb, #rrggbb, rgb(a)()) → painter colour (ABGR number). */
const colorCache = new Map();
function C(css, fallback = '#888888') {
  css = css ?? fallback;
  let c = colorCache.get(css);
  if (c !== undefined) return c;
  let r = 136, g = 136, b = 136;
  const m = /^#([0-9a-f]{3,8})$/i.exec(css);
  if (m) {
    let h = m[1];
    if (h.length === 3 || h.length === 4) h = h.slice(0, 3).split('').map((x) => x + x).join('');
    r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16);
  } else {
    const n = css.match(/[\d.]+/g);
    if (n) [r, g, b] = n.map(Number);
  }
  c = ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
  colorCache.set(css, c);
  return c;
}
const lighten = (c, k) => mix(c, 0xffffffff, k);
const darken = (c, k) => mix(c, 0xff000000, k);

/** A painter over a fresh w × h frame with (ox, oy) as the local origin. */
function sheet(w, h, ox, oy) {
  const frame = createFrame(w, h);
  const p = painterFor(frame);
  p.place(ox, oy);
  return { frame, p, w, h, ox, oy };
}

/** Frame → canvas, with a 1-px ink outline round everything opaque. */
function toCanvas(s, outline = true) {
  const { frame, w, h } = s;
  const col = frame.color;
  if (outline) {
    const add = [];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (col[i] >>> 24) continue;
        if ((x > 0 && col[i - 1] >>> 24 > 200) || (x < w - 1 && col[i + 1] >>> 24 > 200) || (y > 0 && col[i - w] >>> 24 > 200) || (y < h - 1 && col[i + w] >>> 24 > 200)) add.push(i);
      }
    for (const i of add) col[i] = INK;
  }
  const img = new ImageData(w, h);
  composite(frame, img.data, null);
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  cv.getContext('2d').putImageData(img, 0, 0);
  return cv;
}

/** The same canvas with everything but its ink outline turned `color` (hit flash). */
function silhouette(cv, color) {
  const out = document.createElement('canvas');
  out.width = cv.width;
  out.height = cv.height;
  const x = out.getContext('2d');
  x.drawImage(cv, 0, 0);
  const img = x.getImageData(0, 0, out.width, out.height), d = img.data;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16));
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 8) continue;
    if (d[i] === 0x1d && d[i + 1] === 0x1a && d[i + 2] === 0x17) continue; // keep the outline
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  x.putImageData(img, 0, 0);
  return out;
}

// ---------------------------------------------------------------- shapes

/** A disc lit from the top left: highlight, base, shade. */
function ball(p, cx, cy, r, c, light = 0.18, dark = 0.22) {
  p.circle(cx, cy, r, (d, a) => {
    const lx = Math.cos(a) * d, ly = Math.sin(a) * d;
    if (lx + ly < -0.75 && d > 0.45) return lighten(c, light);
    if (lx + ly > 0.7 && d > 0.55) return darken(c, dark);
    return c;
  });
}

/** The upper part of a circle (a cap or dome) from angle a0 to a1 measured as on a clock face. */
function dome(p, cx, cy, r, c, cover) {
  // Fill the part of the disc above the chord at height cy + r * sin(cover).
  const cut = cy - r * Math.sin(cover);
  p.circle(cx, cy, r, (d, a) => {
    const y = cy + Math.sin(a) * d * r;
    if (y > cut) return 0;
    const lx = Math.cos(a) * d, ly = Math.sin(a) * d;
    return lx + ly < -0.8 && d > 0.5 ? lighten(c, 0.2) : lx > 0.55 && d > 0.6 ? darken(c, 0.2) : c;
  });
}

// ---------------------------------------------------------------- figure

/**
 * Draws one figure frame facing right into painter p, local origin = unit centre.
 * R: drawn radius (hit radius × scale). frame: 0..3 walk step. back: seen from behind.
 */
function figure(p, look, R, frame, back) {
  const bulk = look.bulk ?? 1;
  const body = C(look.body ?? look.robe, '#7a6a4f');
  const accent = C(look.accent, '#2a2420');
  const skin = C(look.skin, '#e6c49c');
  const trim = look.trim ? C(look.trim) : 0;
  const hr = R * 0.66, hy = -R * 0.62;
  const model = look.model;

  // Cape behind everything, flapping a little with the step.
  if (look.cape) {
    const flap = frame % 2 ? 1 : 0;
    p.poly([[-R * 0.48 * bulk, -R * 0.08], [R * 0.45 * bulk, -R * 0.08], [R * 0.62 * bulk, R * 0.66], [-R * 0.95 - flap, R * 0.78 + flap]], (x) => (x < -R * 0.5 ? darken(C(look.cape), 0.2) : C(look.cape)));
  }
  // Long hair falling down the back.
  backHair(p, look, R, hr, hy, frame, back);

  // Feet: they patter in turn.
  const lift = [[0, 0], [R * 0.14, 0], [0, 0], [0, R * 0.14]][frame];
  if (!look.mount)
    for (const [k, l] of [[-1, lift[0]], [1, lift[1]]]) p.ellipse(k * R * 0.26, R * 0.68 - l, R * 0.2, R * 0.13, accent);

  // Robe: rounded, lit on the left, shaded on the right, a hem line.
  const top = -R * 0.12, bot = R * 0.66, wt = R * 0.42 * bulk, wb = R * 0.56 * bulk;
  p.poly([[-wt, top], [wt, top], [wb, bot - R * 0.06], [wb * 0.9, bot], [-wb * 0.9, bot], [-wb, bot - R * 0.06]], (x, y) => {
    const u = (x + wb) / (2 * wb);
    if (y > bot - R * 0.1) return darken(body, 0.28);
    return u < 0.22 ? lighten(body, 0.16) : u > 0.74 ? darken(body, 0.22) : body;
  });
  if (look.plates) for (const k of [0.15, 0.35, 0.52]) p.line(-R * 0.46 * bulk, k * R, R * 0.46 * bulk, k * R, C('#c8ccd0'));
  if (trim) {
    // Collar and belt.
    p.line(-R * 0.3 * bulk, -R * 0.08, 0, R * 0.16, trim);
    p.line(0, R * 0.16, R * 0.3 * bulk, -R * 0.08, trim);
    p.rect(-wt * 1.1, R * 0.36, wt * 2.2, Math.max(1, R * 0.08), trim);
  }
  if (look.tassel) p.rect(-R * 0.58, R * 0.2, Math.max(1, R * 0.16), R * 0.3, C(look.tassel));
  if (look.beads)
    for (let i = 0; i <= 8; i++) {
      const t = i / 8 - 0.5;
      p.px(t * R * 0.72 * bulk, R * 0.04 + (1 - (2 * t) ** 2) * R * 0.36, i === 4 ? (trim || C('#e0b24c')) : C(look.beads));
    }
  if (look.pauldrons) for (const k of [-1, 1]) ball(p, k * R * 0.46 * bulk, R * 0.02, R * 0.2, C(look.pauldrons), 0.35);
  if (look.fur) for (let i = 0; i < 6; i++) ball(p, (i / 5 - 0.5) * R * 0.86 * bulk, -R * 0.08, R * 0.14, C(look.fur), 0.1, 0.12);
  // The off hand (the weapon hand is drawn with the weapon).
  ball(p, -R * 0.55 * bulk, R * 0.25, Math.max(1.2, R * 0.13), skin);
  if (look.weapon === undefined) ball(p, R * 0.55 * bulk, R * 0.25, Math.max(1.2, R * 0.13), skin);

  head(p, look, R, hr, hy, frame, back, model);
}

function backHair(p, look, R, hr, hy, frame, back) {
  const sway = frame % 2 ? 1 : 0;
  if (look.model === 'wanggeon' || (look.hair && look.hat === 'royal')) {
    // Long straight black hair down to the shoulders, a blue sheen in it.
    const c = C(look.model ? '#17151c' : look.hair);
    p.poly([[-hr * 1.05, hy], [hr * 0.95, hy], [hr * 0.8, R * 0.28], [-hr * 0.6, R * 0.4 + sway], [-hr * 1.25 - sway, R * 0.3]], c);
    p.line(-hr * 0.9, hy + hr * 0.4, -hr * 0.95 - sway, R * 0.25, C('#3a5ab8'));
  } else if (look.model === 'gyeonhwon' || look.hat === 'warband') {
    // A wild mane flaring past the shoulders in spikes.
    const c = C(look.model ? '#2f1d12' : look.hair ?? '#3a2418');
    const pts = [[-hr * 1.15, hy - hr * 0.2]];
    for (let i = 0; i <= 6; i++) {
      const t = i / 6, x = -hr * 1.35 + t * hr * 2.5, y = R * 0.18 + (i % 2 ? -R * 0.18 : 0) + (t < 0.5 ? sway : 0);
      pts.push([x, y]);
    }
    pts.push([hr * 1.1, hy - hr * 0.2]);
    p.poly(pts, c);
  } else if (look.hair && !['monk', 'hood', 'hoodBlue', 'pirateBoss', 'heavyHelmet', 'hero'].includes(look.hat)) {
    p.poly([[-hr * 1.0, hy], [hr * 0.9, hy], [hr * 0.7, R * 0.2], [-hr * 1.1 - sway, R * 0.22]], C(look.hair));
  }
}

function head(p, look, R, hr, hy, frame, back, model) {
  const skin = C(look.skin, '#e6c49c');
  const trim = look.trim ? C(look.trim) : 0;
  const hat = look.hat;
  // Halo behind the head (old 궁예 look and the 무당).
  if (hat === 'monk' && !model) p.ring(0, hy - R * 0.05, hr * 1.38, 1, trim || C('#e0b24c'));
  // Plume streaming back from a general's helmet.
  if (hat === 'hero') p.poly([[0, hy - hr * 0.9], [-hr * 1.3, hy - hr * 1.8 + (frame % 2)], [-hr * 1.35, hy - hr * 1.1], [0, hy - hr * 0.6]], C(look.plume ?? '#b3261e'));
  // Hood: a cowl round the whole head first.
  if (hat === 'hood' || hat === 'hoodBlue') ball(p, 0, hy, hr * 1.12, C(hat === 'hood' ? look.accent ?? '#3a4a2a' : '#2c4058'), 0.12, 0.2);

  // Head (under a hood, seen from behind, there is only the hood).
  const hooded = hat === 'hood' || hat === 'hoodBlue';
  if (!(hooded && back)) ball(p, 0, hy, hooded ? hr * 0.8 : hr, skin, 0.12, 0.14);
  if (back) {
    if (!['monk', 'hood', 'hoodBlue', 'pirateBoss'].includes(hat) && model !== 'gungye') ball(p, 0, hy + 1, hr * 0.95, C(look.hair ?? (model === 'gyeonhwon' ? '#2f1d12' : model === 'wanggeon' ? '#17151c' : '#2a211b')), 0.1, 0.15);
  } else face(p, look, R, hr, hy, model);
  hatOn(p, look, R, hr, hy, frame, back, model);
}

function face(p, look, R, hr, hy, model) {
  const look2 = hr * 0.16; // eyes glance the way he faces
  const ey = hy + hr * 0.14, ex = hr * 0.38;
  const big = hr >= 8;
  const brows = look.brows ?? (model === 'gyeonhwon' ? 'angry' : model === 'wanggeon' ? 'stern' : undefined);
  // Cheeks.
  for (const k of [-1, 1]) p.px(k * hr * 0.58 + look2, ey + hr * 0.32, C(look.blush ?? '#e8786e'));
  for (const k of [-1, 1]) {
    const cx = Math.round(k * ex + look2);
    if ((look.eyepatch || model === 'gungye') && k === -1) {
      // 궁예's patch over the far eye, a gold rim, a strap across the head.
      p.ellipse(cx, ey, big ? 2.6 : 1.8, big ? 2.2 : 1.6, INK);
      if (look.patchTrim || model === 'gungye') p.px(cx, ey, C(look.patchTrim ?? '#e3b24a'));
      p.line(cx - 2, ey - 2, hr * 0.95, hy - hr * 0.45, INK);
      continue;
    }
    p.rect(cx, Math.round(ey - (big ? 1 : 0)), big ? 2 : 1, big ? 3 : 2, INK);
    if (big) p.px(cx + 1, Math.round(ey - 1), C('#ffffff'));
  }
  if (brows) {
    const e = big ? 1.4 : 1;
    for (const k of [-1, 1]) {
      const cx = k * ex + look2;
      if (brows === 'angry') p.line(cx - k * e * 1.6, ey - e * 2.6, cx + k * e * 1.2, ey - e * 1.7, INK);
      else if (brows === 'stern') p.line(cx - k * e * 1.5, ey - e * 2.4, cx + k * e * 1.2, ey - e * 2.0, INK);
      else p.line(cx - e * 1.2, ey - e * 2.1, cx + e * 1.2, ey - e * 2.1, INK);
    }
  }
  // Mouth.
  if (brows === 'angry' || brows === 'stern') p.line(look2 - hr * 0.14, ey + hr * 0.44, look2 + hr * 0.12, ey + hr * 0.4, darken(C(look.skin, '#e6c49c'), 0.55));
  else {
    p.px(look2 - 1, ey + hr * 0.36, darken(C(look.skin, '#e6c49c'), 0.5));
    p.px(look2, ey + hr * 0.42, darken(C(look.skin, '#e6c49c'), 0.5));
    p.px(look2 + 1, ey + hr * 0.36, darken(C(look.skin, '#e6c49c'), 0.5));
  }
  if (look.mustache) {
    const m = C(look.mustache);
    p.line(look2 - hr * 0.32, ey + hr * 0.36, look2, ey + hr * 0.26, m);
    p.line(look2, ey + hr * 0.26, look2 + hr * 0.32, ey + hr * 0.36, m);
  }
  const beard = look.beard ?? (model === 'gyeonhwon' ? '#2a190e' : undefined);
  if (beard) {
    const b = C(beard);
    p.poly([[-hr * 0.8, hy + hr * 0.25], [-hr * 0.55, hy + hr * 1.1], [look2, hy + hr * 1.42], [hr * 0.55, hy + hr * 1.1], [hr * 0.8, hy + hr * 0.25], [hr * 0.35, hy + hr * 0.7], [look2, hy + hr * 0.6], [-hr * 0.35, hy + hr * 0.7]], b);
    p.line(look2 - 1, hy + hr * 0.75, look2 + 2, hy + hr * 0.75, darken(C(look.skin, '#e6c49c'), 0.55));
  }
}

function hatOn(p, look, R, hr, hy, frame, back, model) {
  const trim = look.trim ? C(look.trim) : 0;
  if (model === 'wanggeon' || look.hat === 'royal') {
    // Hair swept up under a small gold crown with a blue jewel.
    const hair = C(model ? '#17151c' : look.hair ?? '#1a1720');
    dome(p, 0, hy, hr * 1.04, hair, 0.18);
    if (!back) p.poly([[-hr * 0.95, hy - hr * 0.1], [-hr * 0.3, hy - hr * 0.55], [hr * 0.2, hy - hr * 0.35], [hr * 0.95, hy - hr * 0.05], [hr * 0.9, hy - hr * 0.6], [-hr * 0.9, hy - hr * 0.6]], hair);
    const gold = C(model ? '#f2c55c' : look.trim ?? '#e8c060');
    const cy = hy - hr * 1.05;
    p.rect(-hr * 0.45, cy, hr * 0.9, hr * 0.35, gold);
    for (const k of [-1, 0, 1]) p.tri(k * hr * 0.32 - hr * 0.13, cy, k * hr * 0.32 + hr * 0.13, cy, k * hr * 0.32, cy - hr * 0.35, gold);
    p.line(-hr * 0.45, cy + hr * 0.34, hr * 0.45, cy + hr * 0.34, darken(gold, 0.35));
    p.px(0, cy + hr * 0.15, C(model ? '#2f6fe8' : look.jewel ?? '#2f6fe0'));
    return;
  }
  if (model === 'gyeonhwon' || look.hat === 'warband') {
    // Wild hair over the top in spikes, a red band across the brow with tails behind.
    const hair = C(model ? '#2f1d12' : look.hair ?? '#3a2418');
    dome(p, 0, hy, hr * 1.06, hair, 0.12);
    for (let i = 0; i < 5; i++) {
      const g = Math.PI * (1.08 + i * 0.21), x = Math.cos(g) * hr * 1.0, y = hy + Math.sin(g) * hr * 1.0;
      p.tri(x - 2, y + 1, x + 2, y + 1, x + Math.cos(g) * hr * 0.45, y + Math.sin(g) * hr * 0.45, hair);
    }
    if (!back) p.poly([[-hr * 0.9, hy - hr * 0.15], [-hr * 0.2, hy - hr * 0.5], [hr * 0.4, hy - hr * 0.25], [hr * 0.95, hy - hr * 0.2], [hr, hy - hr * 0.6], [-hr, hy - hr * 0.6]], hair);
    const band = C(model ? '#c0392b' : look.band ?? '#c0392b');
    p.rect(-hr * 1.02, hy - hr * 0.55, hr * 2.04, Math.max(2, hr * 0.22), band);
    p.line(-hr * 1.0, hy - hr * 0.45, -hr * 1.6, hy - hr * 0.1 + (frame % 2), band);
    p.line(-hr * 1.0, hy - hr * 0.35, -hr * 1.5, hy + hr * 0.15 + (frame % 2), darken(band, 0.3));
    p.px(hr * 0.1, hy - hr * 0.45, C(look.trim ?? '#f0c050'));
    return;
  }
  if (model === 'gungye' || look.hat === 'monk') {
    // Shaven head: a shine, a sun mark on the brow, gold hoops at the ears.
    p.px(-hr * 0.45, hy - hr * 0.55, C('#ffffff'));
    p.px(-hr * 0.35, hy - hr * 0.65, C('#ffffff'));
    const sun = look.sunMark ?? (model === 'gungye' ? '#3a2a16' : null);
    if (sun && !back) {
      const cx = hr * 0.15, cy = hy - hr * 0.5;
      p.px(cx, cy, C(sun));
      for (let i = 0; i < 4; i++) p.px(cx + Math.round(Math.cos(i * Math.PI / 2) * 2), cy + Math.round(Math.sin(i * Math.PI / 2) * 2), C(sun));
    }
    const hoop = look.earrings ?? (model === 'gungye' ? '#e8b84a' : null);
    if (hoop) p.ring(back ? -hr * 0.95 : -hr * 0.9, hy + hr * 0.35, Math.max(1.5, hr * 0.2), 1, C(hoop));
    return;
  }
  switch (look.hat) {
    case 'helmet':
    case 'helmetBlue': {
      const blue = look.hat === 'helmetBlue';
      dome(p, 0, hy, hr * 1.06, C(blue ? '#33507a' : '#5a4a36'), 0.05);
      p.rect(-hr * 1.06, hy - hr * 0.1, hr * 2.12, Math.max(1, hr * 0.16), C(blue ? '#24324a' : '#3b3328'));
      ball(p, 0, hy - hr * 1.08, Math.max(1.2, hr * 0.18), C('#b3261e'), 0.2, 0.2);
      return;
    }
    case 'hood':
    case 'hoodBlue': {
      // The cowl's rim round the face.
      const c = C(look.hat === 'hood' ? look.accent ?? '#3a4a2a' : '#2c4058');
      if (!back) p.arc(0, hy, hr * 0.92, 2, Math.PI * 1.05, Math.PI * 1.95, darken(c, 0.25));
      return;
    }
    case 'band': {
      dome(p, 0, hy, hr * 1.04, C('#2a211b'), 0.3);
      p.rect(-hr * 1.04, hy - hr * 0.45, hr * 2.08, Math.max(2, hr * 0.2), C('#c0392b'));
      p.line(-hr * 1.0, hy - hr * 0.4, -hr * 1.5, hy - hr * 0.05 + (frame % 2), C('#c0392b'));
      return;
    }
    case 'pirateBoss': {
      // A wide, battered hat with a gold band.
      p.ellipse(0, hy - hr * 0.55, hr * 1.55, hr * 0.38, C('#8a2a1e'));
      dome(p, 0, hy - hr * 0.5, hr * 0.85, C('#8a2a1e'), -0.1);
      p.rect(-hr * 0.85, hy - hr * 0.72, hr * 1.7, Math.max(1, hr * 0.16), C('#c8a860'));
      return;
    }
    case 'heavyHelmet': {
      // Iron helm down to the cheeks, a ridge, a nose guard, a red knob.
      dome(p, 0, hy, hr * 1.1, C('#3c4046'), -0.12);
      p.line(0, hy - hr * 1.08, 0, hy - hr * 0.2, C('#9aa0a6'));
      if (!back) p.rect(hr * 0.1, hy - hr * 0.25, Math.max(1, hr * 0.14), hr * 0.5, C('#4c5157'));
      for (const k of [-1, 1]) p.rect(k > 0 ? hr * 0.75 : -hr * 1.08, hy - hr * 0.1, hr * 0.33, hr * 0.6, C('#4c5157'));
      ball(p, 0, hy - hr * 1.15, Math.max(1.2, hr * 0.17), C('#b3261e'), 0.2, 0.2);
      return;
    }
    case 'crown': {
      dome(p, 0, hy, hr * 1.04, C('#1d1a17'), 0.3);
      const gold = C(look.trim ?? '#d8b46a'), cy = hy - hr * 0.95;
      p.rect(-hr * 0.8, cy, hr * 1.6, hr * 0.32, gold);
      for (const k of [-2, -1, 0, 1, 2]) p.tri(k * hr * 0.32 - 2, cy, k * hr * 0.32 + 2, cy, k * hr * 0.32, cy - hr * 0.4, gold);
      p.px(0, cy + hr * 0.15, C('#3fae7a'));
      return;
    }
    case 'hero': {
      dome(p, 0, hy, hr * 1.08, C('#26262c'), -0.05);
      const t = C(look.trim ?? '#c9a24a');
      p.line(-hr * 1.05, hy - hr * 0.02, hr * 1.05, hy - hr * 0.02, t);
      p.line(0, hy - hr * 1.08, 0, hy - hr * 0.1, t);
      p.tri(-2, hy - hr * 1.05, 2, hy - hr * 1.05, 0, hy - hr * 1.5, t);
      return;
    }
  }
}

// ---------------------------------------------------------------- weapons

/**
 * A weapon in the hand at (0, 0), pointing along +x (the game turns it to the
 * aim), at the same size and grip as the old drawing (×0.8, shifted by the grip).
 */
function weaponSheet(look, R) {
  const k = 0.8, G = (wx, wy) => [k * (wx - 0.2 * R), k * (wy - 0.66 * R)];
  const w = Math.ceil(R * 3.2) + 6, h = Math.ceil(R * 2.2) + 6, ox = Math.ceil(R * 0.8) + 3, oy = Math.ceil(R * 1.1) + 3;
  const s = sheet(w, h, ox, oy), p = s.p;
  const wood = C('#5a3f26'), woodD = C('#3a2c1c'), steel = C('#c8ccd2'), steelD = C('#8a8e94');
  const trim = C(look.trim ?? '#c9a24a');
  const line = (a, b, c, wdt = 1) => {
    p.line(a[0], a[1], b[0], b[1], c);
    if (wdt > 1) p.line(a[0], a[1] + 1, b[0], b[1] + 1, darken(c, 0.25));
  };
  switch (look.weapon) {
    case 'spear':
      line(G(-0.4 * R, 0.62 * R), G(2.0 * R, 0.62 * R), wood, 2);
      p.poly([G(2.0 * R, 0.45 * R), G(2.6 * R, 0.62 * R), G(2.0 * R, 0.79 * R)], steel);
      p.line(...G(2.05 * R, 0.62 * R), ...G(2.5 * R, 0.62 * R), C('#ffffff'));
      p.rect(...G(1.9 * R, 0.6 * R), 2, 3, C('#b3261e'));
      break;
    case 'bow': {
      const [cx, cy] = G(0.35 * R, 0);
      p.arc(cx, cy, 1.05 * R * k, 2, -1.05, 1.05, wood);
      const a = G(0.35 * R + Math.cos(-1.05) * R * 1.05, Math.sin(-1.05) * R * 1.05), b = G(0.35 * R + Math.cos(1.05) * R * 1.05, Math.sin(1.05) * R * 1.05);
      p.line(a[0], a[1], b[0], b[1], C('#e8e0c8'));
      break;
    }
    case 'knife':
      p.rect(...G(0.3 * R, 0.62 * R), R * 0.2, 2, woodD);
      line(G(0.5 * R, 0.7 * R), G(1.4 * R, 0.7 * R), steel, 2);
      break;
    case 'hook': {
      line(G(-0.2 * R, 0.7 * R), G(1.5 * R, 0.7 * R), wood, 2);
      const [cx, cy] = G(1.5 * R, 0.4 * R);
      p.arc(cx, cy, 0.3 * R * k + 1, 2, Math.PI * 0.5, Math.PI * 1.9, steel);
      break;
    }
    case 'glaive':
      line(G(-0.3 * R, 0.65 * R), G(1.9 * R, 0.65 * R), woodD, 2);
      p.poly([G(1.7 * R, 0.65 * R), G(2.15 * R, 0.25 * R), G(2.55 * R, 0.75 * R), G(1.9 * R, 0.9 * R)], (x, y) => (y < G(0, 0.6 * R)[1] ? lighten(steel, 0.2) : steelD));
      break;
    case 'shield': {
      const [cx, cy] = G(0.95 * R, 0);
      p.ellipse(cx, cy, 0.34 * R * k + 1, 1.05 * R * k, (d) => (d > 0.8 ? C('#4a2414') : C('#7a3a24')));
      ball(p, cx + 1, cy, Math.max(1.5, 0.2 * R * k), C('#d2ac58'), 0.3, 0.2);
      break;
    }
    case 'greatsword': {
      const y = 0.7 * R;
      line(G(0.1 * R, y), G(0.5 * R, y), C('#3a2416'), 2);
      p.poly([G(0.52 * R, y - 0.22 * R), G(1.9 * R, y - 0.32 * R), G(2.35 * R, y - 0.28 * R), G(2.48 * R, y - 0.04 * R), G(2.22 * R, y + 0.26 * R), G(0.52 * R, y + 0.22 * R)], (x, yy) => (yy < G(0, y - 0.12 * R)[1] ? C('#9a9890') : C('#e2e0d8')));
      p.line(...G(0.7 * R, y + 0.12 * R), ...G(2.1 * R, y + 0.17 * R), C('#ffffff'));
      p.rect(...G(0.4 * R, y - 0.38 * R), Math.max(2, 0.16 * R * k), 0.76 * R * k, trim);
      break;
    }
    case 'staff': {
      line(G(-0.5 * R, 0.7 * R), G(1.9 * R, 0.7 * R), wood, 2);
      const [cx, cy] = G(2.2 * R, 0.7 * R), gold = C(look.trim ?? '#e0b24c');
      p.ring(cx, cy, 0.34 * R * k + 1, 1, gold);
      for (const kk of [-1, 1]) p.ring(cx, cy + kk * 0.42 * R * k, Math.max(1, 0.12 * R * k + 0.5), 1, gold);
      for (let i = 0; i < 3; i++) p.px(cx - 2 + i * 2, cy + 0.34 * R * k + 2, gold); // the six rings, as beads
      break;
    }
    case 'sword':
      line(G(0.45 * R, 0.68 * R), G(1.9 * R, 0.68 * R), C('#dcdbd2'), 2);
      p.px(...G(1.9 * R, 0.68 * R), C('#ffffff'));
      p.rect(...G(0.42 * R, 0.42 * R), 2, 0.52 * R * k, trim);
      p.line(...G(0.2 * R, 0.68 * R), ...G(0.42 * R, 0.68 * R), C('#3a2416'));
      break;
  }
  // The hand round the grip.
  ball(p, 0, 0, Math.max(1.2, R * 0.13), C(look.skin, '#e6c49c'));
  return { canvas: toCanvas(s), ox, oy };
}

// ---------------------------------------------------------------- horse

function horseFrame(color, R, f) {
  const w = Math.ceil(R * 3.4) + 6, h = Math.ceil(R * 2.4) + 6, ox = Math.ceil(R * 1.6) + 3, oy = Math.ceil(R * 1.0) + 3;
  const s = sheet(w, h, ox, oy), p = s.p;
  const c = C(color), cd = darken(c, 0.25), mane = C(color === '#f2ede0' ? '#d8cbb0' : '#1d1a17');
  // Legs at a gallop: front pair and back pair swing opposite.
  const sw = [0, 1, 0, -1][f] * R * 0.18;
  for (const [lx, ph] of [[-0.75, 1], [-0.45, -1], [0.5, -1], [0.8, 1]]) {
    const x0 = lx * R, x1 = x0 + sw * ph;
    p.line(x0, R * 0.42, x1, R * 0.9, ph > 0 ? cd : c);
    p.line(x0 + 1, R * 0.42, x1 + 1, R * 0.9, ph > 0 ? cd : c);
    p.px(x1, R * 0.92, C('#1d1a17'));
    p.px(x1 + 1, R * 0.92, C('#1d1a17'));
  }
  // Tail streaming back.
  p.poly([[-R * 0.9, R * 0.05], [-R * 1.45, R * 0.25 + (f % 2)], [-R * 1.3, R * 0.5], [-R * 0.85, R * 0.25]], mane);
  // Barrel, neck, head.
  p.ellipse(0, R * 0.25, R * 0.95, R * 0.34, (d, a) => (Math.sin(a) > 0.4 && d > 0.6 ? cd : Math.sin(a) < -0.5 && d > 0.55 ? lighten(c, 0.15) : c));
  p.poly([[R * 0.55, R * 0.15], [R * 0.75, -R * 0.4], [R * 1.05, -R * 0.45], [R * 0.95, R * 0.2]], c);
  p.poly([[R * 0.8, -R * 0.5], [R * 1.45, -R * 0.3], [R * 1.45, -R * 0.12], [R * 0.95, -R * 0.15]], c);
  p.px(R * 1.1, -R * 0.38, C('#1d1a17'));
  p.tri(R * 0.82, -R * 0.5, R * 0.95, -R * 0.5, R * 0.86, -R * 0.68, c);
  // Mane down the neck.
  p.poly([[R * 0.62, -R * 0.05], [R * 0.78, -R * 0.52], [R * 0.86, -R * 0.48], [R * 0.72, R * 0.05]], mane);
  // Saddle cloth.
  p.rect(-R * 0.35, R * 0.0, R * 0.7, R * 0.28, C('#a8321e'));
  p.line(-R * 0.35, R * 0.28, R * 0.35, R * 0.28, C('#e0b24c'));
  return { canvas: toCanvas(s), ox, oy };
}

// ---------------------------------------------------------------- cache + draw

const cache = new Map();
const MAX = 400;
// Most looks are the same object every frame (an enemy's def.look): remember its key.
const keyOf = new WeakMap();

function setFor(look, R) {
  let lk = keyOf.get(look);
  if (!lk) keyOf.set(look, (lk = JSON.stringify(look)));
  const key = `${Math.round(R * 2)}|${lk}`;
  let set = cache.get(key);
  if (set) return set;
  const w = Math.ceil(R * 3.6) + 8, h = Math.ceil(R * 3.6) + 8, ox = Math.ceil(w / 2), oy = Math.ceil(R * 2.3) + 4;
  const frames = { front: [], back: [] };
  for (const side of ['front', 'back'])
    for (let f = 0; f < 4; f++) {
      const s = sheet(w, h, ox, oy);
      figure(s.p, look, R, f, side === 'back');
      frames[side].push(toCanvas(s));
    }
  set = { frames, ox, oy, flash: new Map(), weapon: look.weapon ? weaponSheet(look, R) : null, horse: null, horseColor: null };
  if (cache.size > MAX) cache.delete(cache.keys().next().value);
  cache.set(key, set);
  return set;
}

function flashOf(set, side, f) {
  const k = side + f;
  let c = set.flash.get(k);
  if (!c) set.flash.set(k, (c = silhouette(set.frames[side][f], HANJI)));
  return c;
}

/**
 * Draws a person in pixel art. Called by drawUnit with the canvas already at the
 * unit's centre (shadow, elite ring and aura drawn). `R` is the drawn radius.
 * hand(): where the weapon hand is and its turn, from the old swing maths.
 * Returns false for anything this can't draw (beasts, carts).
 */
export function drawPixelFigure(ctx, look, R, facing, phase, flash, hand) {
  if (look.beast || look.hat === 'cart') return false;
  const sx = Math.cos(facing) < 0 ? -1 : 1;
  const back = Math.sin(facing) < -0.75;
  const f = ((Math.floor(phase / (Math.PI / 2)) % 4) + 4) % 4;
  const set = setFor(look, R);
  ctx.imageSmoothingEnabled = false;
  if (look.mount) {
    if (!set.horse || set.horseColor !== look.mount) {
      set.horse = [0, 1, 2, 3].map((i) => horseFrame(look.mount, R, i));
      set.horseColor = look.mount;
    }
    const hf = set.horse[f];
    ctx.save();
    ctx.scale(sx, 1);
    if (flash) hf.flash ??= silhouette(hf.canvas, HANJI);
    ctx.drawImage(flash ? hf.flash : hf.canvas, -hf.ox, -hf.oy);
    ctx.restore();
    ctx.translate(0, -Math.round(R * 0.55));
  }
  // A small hop with the step, in whole pixels.
  ctx.translate(0, -Math.round(Math.abs(Math.sin(phase)) * R * 0.1));
  const side = back ? 'back' : 'front';
  const drawWeapon = () => {
    if (!set.weapon) return;
    const h = hand();
    ctx.save();
    ctx.translate(Math.round(h.x), Math.round(h.y));
    ctx.rotate(h.rot);
    if (h.scale !== 1) ctx.scale(h.scale, h.scale);
    const wc = set.weapon;
    if (flash) wc.flash ??= silhouette(wc.canvas, HANJI);
    ctx.drawImage(flash ? wc.flash : wc.canvas, -wc.ox, -wc.oy);
    ctx.restore();
  };
  if (back) drawWeapon();
  ctx.save();
  ctx.scale(sx, 1);
  ctx.drawImage(flash ? flashOf(set, side, f) : set.frames[side][f], -set.ox, -set.oy);
  ctx.restore();
  if (!back) drawWeapon();
  return true;
}
