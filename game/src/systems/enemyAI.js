import { updateBoss } from './bossAI.js';
import { rand, angleDiff } from '../core/math.js';

/**
 * Enemy behaviours keyed by EnemyDef.behavior. Each sets the desired
 * velocity (e.vx, e.vy) and may fire projectiles. The game applies
 * knockback, slows, stun and separation afterwards.
 */
export const BEHAVIORS = {
  chase(g, e, dt) {
    const { dx, dy, d } = toTarget(g, e);
    const want = Math.atan2(dy, dx);
    const turn = e.def.params?.turnRate;
    if (turn) {
      // Slow-turning units (shield bearers) can be flanked by circling them.
      const diff = angleDiff(want, e.facing);
      e.facing += Math.sign(diff) * Math.min(Math.abs(diff), turn * dt);
      e.vx = Math.cos(e.facing) * e.speed;
      e.vy = Math.sin(e.facing) * e.speed;
      return;
    }
    e.vx = (dx / d) * e.speed;
    e.vy = (dy / d) * e.speed;
    e.facing = want;
  },

  ranged(g, e, dt) {
    const P = e.def.params;
    const { dx, dy, d } = toTarget(g, e);
    e.facing = Math.atan2(dy, dx);
    e.retreat = (e.retreat ?? 0) - dt;
    let dir = 0;
    if (e.retreat > 0 || d < P.keepMin) dir = -1;
    else if (d > P.keepMax) dir = 1;
    // Drift sideways while holding range so archers do not stack.
    const side = e.seed > 0.5 ? 1 : -1;
    e.vx = (dx / d) * e.speed * dir + (-dy / d) * e.speed * 0.35 * side;
    e.vy = (dy / d) * e.speed * dir + (dx / d) * e.speed * 0.35 * side;
    e.timer = (e.timer ?? P.fireEvery * e.seed) - dt;
    if (e.timer <= 0 && d < P.keepMax + 120 && !(g.isCharmed(e) && g.targetFor(e) === g.player)) {
      e.timer = P.fireEvery;
      const n = P.volley ?? 1;
      const spread = ((P.spread ?? 0) * Math.PI) / 180;
      for (let i = 0; i < n; i++) {
        const a = e.facing + (n > 1 ? -spread / 2 + (spread * i) / (n - 1) : 0);
        const charmed = g.isCharmed(e);
        g.projectiles.push({
          team: charmed ? 'charm' : 'enemy', kind: 'arrow', x: e.x, y: e.y,
          vx: Math.cos(a) * P.arrowSpeed, vy: Math.sin(a) * P.arrowSpeed,
          r: 5, damage: charmed ? P.arrowDamage * 3 * e.charmPower : P.arrowDamage * e.damageMul, life: 2.2, angle: a, source: e.def.id, owner: e,
        });
      }
      if (P.retreat) e.retreat = P.retreat;
    }
  },

  dasher(g, e, dt) {
    const P = e.def.params;
    const { dx, dy, d } = toTarget(g, e);
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

  /** Cavalry: circle the target at a distance, then charge straight through. */
  charger(g, e, dt) {
    const P = e.def.params;
    const { dx, dy, d } = toTarget(g, e);
    e.state ??= 'circle';
    if (e.state === 'circle') {
      e.t = e.t ?? rand(P.circleTime[0], P.circleTime[1]);
      const side = e.seed > 0.5 ? 1 : -1;
      // Tangential run plus a pull toward the orbit radius.
      const pull = (d - P.orbit) / P.orbit;
      const tx = (-dy / d) * side, ty = (dx / d) * side;
      let vx = tx + (dx / d) * pull * 1.6, vy = ty + (dy / d) * pull * 1.6;
      const l = Math.hypot(vx, vy) || 1;
      e.vx = (vx / l) * e.speed;
      e.vy = (vy / l) * e.speed;
      e.facing = Math.atan2(e.vy, e.vx);
      e.t -= dt;
      if (e.t <= 0 && d < P.orbit * 1.6) {
        e.state = 'windup';
        e.t = P.windup;
        e.dashDir = Math.atan2(dy, dx);
      }
    } else if (e.state === 'windup') {
      e.vx *= 0.85;
      e.vy *= 0.85;
      e.facing = e.dashDir;
      e.t -= dt;
      if (e.t <= 0) {
        e.state = 'charge';
        // Event charges (기병 돌격) run much farther than a normal pass.
        e.travel = -(e.longRun ?? 0);
        e.longRun = 0;
      }
    } else if (e.state === 'charge') {
      e.vx = Math.cos(e.dashDir) * P.chargeSpeed;
      e.vy = Math.sin(e.dashDir) * P.chargeSpeed;
      e.travel += P.chargeSpeed * dt;
      if (P.dust && Math.random() < dt * 14) {
        g.zones.push({ team: 'enemy', kind: 'dust', x: e.x, y: e.y, r: 34, slow: 0.45, life: 0.9, t: 0 });
      }
      if (e.travel >= P.chargeDistance) {
        e.state = 'circle';
        e.t = rand(P.circleTime[0], P.circleTime[1]);
      }
    }
  },

  static(g, e) {
    e.vx = e.vy = 0;
  },

  boss: updateBoss,
};

/** Vector to what this enemy is chasing: the hero, or a decoy that lures it. */
function toTarget(g, e) {
  const t = g.targetFor(e);
  const dx = t.x - e.x, dy = t.y - e.y;
  return { dx, dy, d: Math.hypot(dx, dy) || 1 };
}
