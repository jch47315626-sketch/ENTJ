/**
 * 견훤's 함정: every few seconds a buried blast-pot is laid at his feet.
 * The first foe to step on an armed trap sets it off, hurting and
 * knocking back everything around it.
 */
import { dist2 } from '../core/math.js';

export const TRAP = {
  every: [0, 5, 4.2, 3.4], // seconds between traps, by level
  max: [0, 3, 4, 5], // traps on the field at once
  damage: [0, 45, 60, 80],
  radius: [0, 80, 92, 105],
  trigger: 20, // how close a foe must step
  arm: 0.6, // seconds before a fresh trap can go off
  life: 25,
};

export function updateTraps(g, dt) {
  const p = g.player;
  const lv = p.upgrades.traps ?? 0;
  if (!lv) return;
  g.traps ??= [];
  g.trapCd = (g.trapCd ?? 1.5) - dt;
  if (g.trapCd <= 0) {
    g.trapCd = TRAP.every[lv];
    if (g.traps.length >= TRAP.max[lv]) g.traps.shift(); // oldest makes way
    g.traps.push({ x: p.x, y: p.y, t: 0 });
  }
  for (const tr of g.traps) {
    tr.t += dt;
    if (tr.t < TRAP.arm || tr.gone) continue;
    let stepped = false;
    g.grid.query(tr.x, tr.y, TRAP.trigger + 30, (e) => {
      if (stepped || e.dead || e.def.behavior === 'static' || g.isCharmed(e)) return;
      const rr = TRAP.trigger + e.r;
      if (dist2(tr.x, tr.y, e.x, e.y) < rr * rr) stepped = true;
    });
    if (stepped) explode(g, tr, lv);
  }
  g.traps = g.traps.filter((tr) => !tr.gone && tr.t < TRAP.life);
}

function explode(g, tr, lv) {
  tr.gone = true;
  const r = TRAP.radius[lv] * g.player.stats.area;
  const dmg = TRAP.damage[lv] * g.player.stats.might;
  g.grid.query(tr.x, tr.y, r + 30, (e) => {
    if (e.dead || g.isCharmed(e)) return;
    const rr = r + e.r;
    if (dist2(tr.x, tr.y, e.x, e.y) < rr * rr) g.damageEnemy(e, dmg, tr.x, tr.y, 160);
  });
  g.fx.push({ type: 'blast', x: tr.x, y: tr.y, range: r, t: 0, life: 0.45 });
  g.shake(5);
  g.sfx('blast');
}
