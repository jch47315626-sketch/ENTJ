import { hash2 } from '../core/math.js';

/**
 * 지형 (stage.terrain): boulders nobody can walk through, and bog where the
 * hero's feet sink. Both are laid out from a tile hash, so the field is the
 * same wherever the camera goes; the hero's starting ground stays clear.
 * Falling rocks (낙석) add boulders for a while (g.tempRocks).
 *   terrain = { rocks: share of tiles with a boulder, bog: share with a bog,
 *               clear: radius kept open around the start, bogSlow }
 */
export const TILE = 240;

const cache = new Map();

/** The boulders of one tile (cached). */
function tileRocks(T, tx, ty) {
  const key = `${tx},${ty}`;
  let list = cache.get(key);
  if (list) return list;
  list = [];
  const ox = tx * TILE, oy = ty * TILE;
  const add = (salt, rMin, rMax) => {
    const x = ox + 40 + hash2(tx, ty, salt + 1) * (TILE - 80);
    const y = oy + 40 + hash2(tx, ty, salt + 2) * (TILE - 80);
    const r = rMin + hash2(tx, ty, salt + 3) * (rMax - rMin);
    if (Math.hypot(x, y) < T.clear + r) return;
    list.push({ x, y, r, seed: hash2(tx, ty, salt + 4) });
  };
  if (hash2(tx, ty, 31) < T.rocks) add(31, 30, 64);
  if (hash2(tx, ty, 41) < T.rocks * 0.45) add(41, 22, 40);
  cache.set(key, list);
  return list;
}

/** Every boulder (fixed and fallen) within `R` of a point. */
export function rocksNear(g, x, y, R) {
  const T = g.stage.terrain;
  if (!T) return [];
  const out = [];
  const tx0 = Math.floor((x - R - 80) / TILE), tx1 = Math.floor((x + R + 80) / TILE);
  const ty0 = Math.floor((y - R - 80) / TILE), ty1 = Math.floor((y + R + 80) / TILE);
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) out.push(...tileRocks(T, tx, ty));
  for (const r of g.tempRocks ?? []) out.push(r);
  return out;
}

/** The bog patch of a tile, if it has one: an ellipse { x, y, rx, ry }. */
export function tileBog(T, tx, ty) {
  if (hash2(tx, ty, 51) >= T.bog) return null;
  const ox = tx * TILE, oy = ty * TILE;
  const x = ox + 60 + hash2(tx, ty, 52) * (TILE - 120), y = oy + 60 + hash2(tx, ty, 53) * (TILE - 120);
  if (Math.hypot(x, y) < T.clear) return null;
  return { x, y, rx: 70 + hash2(tx, ty, 54) * 70, ry: 42 + hash2(tx, ty, 55) * 38 };
}

/** Whether a point is in a bog. */
export function inBog(g, x, y) {
  const T = g.stage.terrain;
  if (!T?.bog) return false;
  const tx0 = Math.floor((x - 150) / TILE), tx1 = Math.floor((x + 150) / TILE);
  const ty0 = Math.floor((y - 100) / TILE), ty1 = Math.floor((y + 100) / TILE);
  for (let tx = tx0; tx <= tx1; tx++) for (let ty = ty0; ty <= ty1; ty++) {
    const b = tileBog(T, tx, ty);
    if (b && ((x - b.x) / b.rx) ** 2 + ((y - b.y) / b.ry) ** 2 < 1) return true;
  }
  return false;
}

/** Pushes a round body out of any boulder it overlaps; true if it touched one. */
export function collideRocks(g, u) {
  let hit = false;
  for (const r of rocksNear(g, u.x, u.y, u.r)) {
    const dx = u.x - r.x, dy = u.y - r.y;
    const min = r.r + u.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= min * min) continue;
    const d = Math.sqrt(d2) || 0.01;
    u.x = r.x + (dx / d) * min;
    u.y = r.y + (dy / d) * min;
    hit = true;
  }
  return hit;
}

/** 낙석: boulders crash down on warned spots, hurt whoever stands there and stay a while. */
export function rockfall(g, spots, { warn = 1.1, radius = 46, damage = 20, life = 16 } = {}) {
  for (const s of spots) g.fx.push({ type: 'ringWarn', x: s.x, y: s.y, range: radius, t: 0, life: warn });
  g.later(warn, () => {
    const p = g.player;
    g.tempRocks ??= [];
    for (const s of spots) {
      if ((p.x - s.x) ** 2 + (p.y - s.y) ** 2 < (radius + p.r * 0.5) ** 2) g.hurtPlayer(damage, 'rockfall');
      g.tempRocks.push({ x: s.x, y: s.y, r: radius * 0.75, seed: Math.random(), until: g.time + life, fallen: true });
      g.fx.push({ type: 'puff', x: s.x, y: s.y, t: 0, life: 0.6, size: 34, tone: 'mud' });
    }
    g.shake(8);
    g.sfx('quake');
  });
}

/** Each frame: fallen rocks crumble away; everyone is kept out of boulders. */
export function updateTerrain(g) {
  if (!g.stage.terrain) return;
  if (g.tempRocks?.length) g.tempRocks = g.tempRocks.filter((r) => r.until > g.time);
  collideRocks(g, g.player);
  for (const e of g.enemies) {
    if (e.dead || e.hidden) continue;
    if (collideRocks(g, e) && e.isBoss && e.ps === 'dash') e.hitWall = true;
  }
  for (const a of g.allies) if (a.kind !== 'maguni' && a.kind !== 'maguniBomb') collideRocks(g, a);
}
