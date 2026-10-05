import { TAU } from '../core/math.js';

/** Updates summoned soldiers and following archers. */
export function updateAllies(g, dt) {
  const p = g.player;
  let archerIndex = 0;
  const archerCount = g.allies.filter((a) => a.kind === 'archer').length;

  for (const a of g.allies) {
    if (a.kind === 'soldier') {
      a.life -= dt;
      a.cd -= dt;
      const target = g.nearestEnemy(a.x, a.y, 420);
      let tx, ty;
      if (target) {
        tx = target.x; ty = target.y;
      } else {
        tx = p.x + Math.cos(a.facing) * 50; ty = p.y + Math.sin(a.facing) * 50;
      }
      const dx = tx - a.x, dy = ty - a.y;
      const d = Math.hypot(dx, dy) || 1;
      const reach = target ? target.r + a.r + 6 : 8;
      if (d > reach) {
        a.x += (dx / d) * 175 * dt;
        a.y += (dy / d) * 175 * dt;
      }
      if (target) a.facing = Math.atan2(dy, dx);
      if (target && d <= reach + 14 && a.cd <= 0) {
        a.cd = 0.7;
        g.damageEnemy(target, 9 * p.stats.might, a.x, a.y, 50);
        g.fx.push({ type: 'thrust', x: a.x, y: a.y, angle: a.facing, t: 0, life: 0.15 });
      }
      if (a.life <= 0) {
        a.dead = true;
        g.fx.push({ type: 'puff', x: a.x, y: a.y, t: 0, life: 0.5, size: 16, tone: 'light' });
      }
    } else if (a.kind === 'archer') {
      // Archers trail the hero on a slowly turning ring.
      const ang = g.time * 0.6 + (archerIndex / archerCount) * TAU;
      archerIndex++;
      const tx = p.x + Math.cos(ang) * 48, ty = p.y + Math.sin(ang) * 48;
      a.x += (tx - a.x) * Math.min(1, dt * 8);
      a.y += (ty - a.y) * Math.min(1, dt * 8);
      a.cd -= dt;
      const target = g.nearestEnemy(a.x, a.y, 380);
      if (target) a.facing = Math.atan2(target.y - a.y, target.x - a.x);
      if (target && a.cd <= 0) {
        a.cd = 1.4 * p.stats.haste;
        const s = 440;
        g.projectiles.push({
          team: 'player', kind: 'arrow', x: a.x, y: a.y,
          vx: Math.cos(a.facing) * s, vy: Math.sin(a.facing) * s,
          r: 5, damage: 10 * p.stats.might, knockback: 25, life: 1, pierce: 1, hit: new Set(), angle: a.facing,
        });
      }
    }
  }
  g.allies = g.allies.filter((a) => !a.dead);
}
