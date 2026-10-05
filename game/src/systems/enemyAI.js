import { updateBoss } from './bossAI.js';

/**
 * Enemy behaviours keyed by EnemyDef.behavior. Each sets the desired
 * velocity (e.vx, e.vy) and may fire projectiles. The game applies
 * knockback, slows and separation afterwards.
 */
export const BEHAVIORS = {
  chase(g, e) {
    const { dx, dy, d } = toPlayer(g, e);
    e.vx = (dx / d) * e.speed;
    e.vy = (dy / d) * e.speed;
    e.facing = Math.atan2(dy, dx);
  },

  ranged(g, e, dt) {
    const P = e.def.params;
    const { dx, dy, d } = toPlayer(g, e);
    e.facing = Math.atan2(dy, dx);
    let dir = 0;
    if (d > P.keepMax) dir = 1;
    else if (d < P.keepMin) dir = -1;
    // Drift sideways while holding range so archers do not stack.
    const side = e.seed > 0.5 ? 1 : -1;
    e.vx = (dx / d) * e.speed * dir + (-dy / d) * e.speed * 0.35 * side;
    e.vy = (dy / d) * e.speed * dir + (dx / d) * e.speed * 0.35 * side;
    e.timer = (e.timer ?? P.fireEvery * e.seed) - dt;
    if (e.timer <= 0 && d < P.keepMax + 120) {
      e.timer = P.fireEvery;
      g.projectiles.push({
        team: 'enemy', kind: 'arrow', x: e.x, y: e.y,
        vx: (dx / d) * P.arrowSpeed, vy: (dy / d) * P.arrowSpeed,
        r: 5, damage: P.arrowDamage * e.damageMul, life: 2.2, angle: e.facing,
      });
    }
  },

  dasher(g, e, dt) {
    const P = e.def.params;
    const { dx, dy, d } = toPlayer(g, e);
    e.state ??= 'approach';
    e.cd = (e.cd ?? 0) - dt;
    if (e.state === 'approach') {
      e.vx = (dx / d) * e.speed;
      e.vy = (dy / d) * e.speed;
      e.facing = Math.atan2(dy, dx);
      if (d < P.triggerRange && e.cd <= 0) {
        e.state = 'windup';
        e.t = P.windup;
        e.dashDir = e.facing;
      }
    } else if (e.state === 'windup') {
      e.vx = e.vy = 0;
      e.t -= dt;
      if (e.t <= 0) {
        e.state = 'dash';
        e.t = P.dashTime;
      }
    } else if (e.state === 'dash') {
      e.vx = Math.cos(e.dashDir) * P.dashSpeed;
      e.vy = Math.sin(e.dashDir) * P.dashSpeed;
      e.t -= dt;
      if (e.t <= 0) {
        e.state = 'approach';
        e.cd = P.cooldown;
      }
    }
  },

  static(g, e) {
    e.vx = e.vy = 0;
  },

  boss: updateBoss,
};

function toPlayer(g, e) {
  const dx = g.player.x - e.x, dy = g.player.y - e.y;
  return { dx, dy, d: Math.hypot(dx, dy) || 1 };
}
