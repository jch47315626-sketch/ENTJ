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
    if (e.timer <= 0 && d < P.keepMax + 60 && !(g.isCharmed(e) && g.targetFor(e) === g.player)) {
      e.timer = P.fireEvery;
      const n = P.volley ?? 1;
      const spread = ((P.spread ?? 0) * Math.PI) / 180;
      for (let i = 0; i < n; i++) {
        const a = e.facing + (n > 1 ? -spread / 2 + (spread * i) / (n - 1) : 0);
        const charmed = g.isCharmed(e);
        g.projectiles.push({
          team: charmed ? 'charm' : 'enemy', kind: 'arrow', x: e.x, y: e.y,
          vx: Math.cos(a) * P.arrowSpeed, vy: Math.sin(a) * P.arrowSpeed,
          r: 5, damage: charmed ? P.arrowDamage * 3 * e.charmPower : P.arrowDamage * e.damageMul, life: 1.1, angle: a, source: e.def.id, owner: e,
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

  /** 투석병: holds range and lobs stones at where the hero is heading. */
  lobber(g, e, dt) {
    const P = e.def.params;
    const { dx, dy, d } = toTarget(g, e);
    e.facing = Math.atan2(dy, dx);
    const dir = d < P.keepMin ? -1 : d > P.keepMax ? 1 : 0;
    const side = e.seed > 0.5 ? 1 : -1;
    e.vx = (dx / d) * e.speed * dir + (-dy / d) * e.speed * 0.3 * side;
    e.vy = (dy / d) * e.speed * dir + (dx / d) * e.speed * 0.3 * side;
    e.timer = (e.timer ?? P.fireEvery * (0.5 + e.seed)) - dt;
    if (e.timer > 0 || d > P.keepMax + 120 || g.isCharmed(e)) return;
    e.timer = P.fireEvery;
    const p = g.player;
    const tx = p.x + p.vx * P.lead, ty = p.y + p.vy * P.lead;
    g.fx.push({ type: 'ringWarn', x: tx, y: ty, range: P.radius, t: 0, life: P.flight });
    g.fx.push({ type: 'lob', x: e.x, y: e.y, x1: tx, y1: ty, t: 0, life: P.flight });
    const dmg = P.rockDamage * e.damageMul;
    g.later(P.flight, () => {
      if ((p.x - tx) ** 2 + (p.y - ty) ** 2 < (P.radius + p.r * 0.5) ** 2) g.hurtPlayer(dmg, 'slinger', e.dead ? null : e);
      g.fx.push({ type: 'puff', x: tx, y: ty, t: 0, life: 0.45, size: 22, tone: 'mud' });
    });
  },

  /** 도끼 광전사: closes in, winds up, then whirls while walking at the hero. */
  whirl(g, e, dt) {
    const P = e.def.params;
    const { dx, dy, d } = toTarget(g, e);
    e.state ??= 'approach';
    e.cd = (e.cd ?? 0) - dt;
    if (e.state === 'approach') {
      e.vx = (dx / d) * e.speed;
      e.vy = (dy / d) * e.speed;
      e.facing = Math.atan2(dy, dx);
      if (d < P.trigger && e.cd <= 0) {
        e.state = 'windup';
        e.t = P.windup;
        g.fx.push({ type: 'ringWarn', x: e.x, y: e.y, range: P.spinRadius, t: 0, life: P.windup, follow: e });
      }
    } else if (e.state === 'windup') {
      e.vx = e.vy = 0;
      e.t -= dt;
      if (e.t <= 0) {
        e.state = 'spin';
        e.t = P.spinTime;
        e.tick = 0;
      }
    } else if (e.state === 'spin') {
      e.vx = (dx / d) * e.speed * P.spinSpeed;
      e.vy = (dy / d) * e.speed * P.spinSpeed;
      e.facing += dt * 18;
      e.tick -= dt;
      if (e.tick <= 0) {
        e.tick = P.spinEvery;
        g.fx.push({ type: 'whirl', x: e.x, y: e.y, range: P.spinRadius, angle: e.facing, t: 0, life: 0.22 });
        const p = g.player;
        if (!g.isCharmed(e) && (p.x - e.x) ** 2 + (p.y - e.y) ** 2 < (P.spinRadius + p.r) ** 2) g.hurtPlayer(P.spinDamage * e.damageMul, 'axeman', e);
      }
      e.t -= dt;
      if (e.t <= 0) {
        e.state = 'approach';
        e.cd = P.cooldown;
      }
    }
  },

  /** 덫꾼: runs in close, plants a spike trap, then runs off. */
  trapper(g, e, dt) {
    const P = e.def.params;
    const { dx, dy, d } = toTarget(g, e);
    e.cd = (e.cd ?? P.cooldown * e.seed) - dt;
    e.flee = (e.flee ?? 0) - dt;
    let dir = 1;
    if (e.flee > 0) dir = -1;
    else if (e.cd > 0 && d < P.plantRange * 2) dir = -0.4;
    const side = e.seed > 0.5 ? 1 : -1;
    e.vx = (dx / d) * e.speed * dir + (-dy / d) * e.speed * 0.4 * side;
    e.vy = (dy / d) * e.speed * dir + (dx / d) * e.speed * 0.4 * side;
    e.facing = Math.atan2(e.vy, e.vx);
    if (e.cd <= 0 && d < P.plantRange && !g.isCharmed(e)) {
      e.cd = P.cooldown;
      e.flee = P.flee;
      // Between itself and the hero, a little ahead of the hero.
      const x = e.x + dx * 0.7, y = e.y + dy * 0.7;
      g.zones.push({ team: 'enemy', kind: 'spikes', x, y, r: P.trapRadius, dps: P.trapDps * e.damageMul, slow: P.trapSlow, life: P.trapLife, t: 0, source: 'trapper' });
      g.fx.push({ type: 'puff', x, y, t: 0, life: 0.35, size: 12, tone: 'mud' });
    }
  },

  /** 무당: keeps her distance and, every few seconds, heals and quickens the foes around her. */
  shaman(g, e, dt) {
    const P = e.def.params;
    const { dx, dy, d } = toTarget(g, e);
    e.facing = Math.atan2(dy, dx);
    const dir = d < P.keepMin ? -1 : d > P.keepMax ? 1 : 0;
    e.vx = (dx / d) * e.speed * dir;
    e.vy = (dy / d) * e.speed * dir;
    e.timer = (e.timer ?? P.every * e.seed) - dt;
    if (e.timer > 0 || g.isCharmed(e)) return;
    e.timer = P.every;
    let n = 0;
    g.grid.query(e.x, e.y, P.radius, (o) => {
      if (o.dead || o.isBoss || o.def.behavior === 'static' || g.isCharmed(o)) return;
      if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 > P.radius * P.radius) return;
      o.hp = Math.min(o.maxHp, o.hp + o.maxHp * P.heal);
      o.hasteUntil = g.time + P.buff;
      n++;
    });
    g.fx.push({ type: 'pulse', x: e.x, y: e.y, range: P.radius, t: 0, life: 0.7 });
    if (n > 3) g.sfx('drumRoll');
  },

  /** 땅굴병: tunnels unseen toward the hero, bursts out under a warned circle, fights a while, digs again. */
  burrow(g, e, dt) {
    const P = e.def.params;
    const { dx, dy, d } = toTarget(g, e);
    if (!e.state) {
      e.state = 'under';
      e.hidden = true;
      e.t = P.underTime * (0.6 + 0.6 * e.seed);
    }
    e.t -= dt;
    if (e.state === 'under') {
      e.vx = (dx / d) * P.underSpeed;
      e.vy = (dy / d) * P.underSpeed;
      e.facing = Math.atan2(dy, dx);
      if (e.t <= 0 || d < 40) {
        e.state = 'rise';
        e.t = P.warn;
        g.fx.push({ type: 'ringWarn', x: e.x, y: e.y, range: P.popRadius, t: 0, life: P.warn });
      }
    } else if (e.state === 'rise') {
      e.vx = e.vy = 0;
      if (e.t <= 0) {
        e.state = 'surface';
        e.hidden = false;
        e.t = P.surfaceTime;
        const p = g.player;
        if ((p.x - e.x) ** 2 + (p.y - e.y) ** 2 < (P.popRadius + p.r) ** 2 && !g.isCharmed(e)) g.hurtPlayer(P.popDamage * e.damageMul, 'mole', e);
        g.fx.push({ type: 'puff', x: e.x, y: e.y, t: 0, life: 0.6, size: 30, tone: 'mud' });
        g.sfx('dig');
      }
    } else {
      e.vx = (dx / d) * e.speed;
      e.vy = (dy / d) * e.speed;
      e.facing = Math.atan2(dy, dx);
      if (e.t <= 0 && !g.isCharmed(e)) {
        e.state = 'under';
        e.hidden = true;
        e.t = P.underTime;
        g.fx.push({ type: 'puff', x: e.x, y: e.y, t: 0, life: 0.5, size: 22, tone: 'mud' });
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
