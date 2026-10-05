import { TAU } from '../core/math.js';
import { hitArc } from './weapons.js';

/** Updates summoned soldiers and following archers. */
export function updateAllies(g, dt) {
  const p = g.player;
  updateOrders(g, dt);
  let archerIndex = 0;
  const archerCount = g.allies.filter((a) => a.kind === 'archer').length;
  let maguniIndex = 0;
  const maguniCount = g.allies.filter((a) => a.kind === 'maguni').length;

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
        a.x += (dx / d) * SOLDIER.speed * dt;
        a.y += (dy / d) * SOLDIER.speed * dt;
      }
      if (target) a.facing = Math.atan2(dy, dx);
      if (target && d <= reach + 14 && a.cd <= 0) {
        a.cd = SOLDIER.cooldown * p.stats.haste;
        g.damageEnemy(target, SOLDIER.damage * p.stats.might * (1 + (p.meta.allyMul ?? 0)), a.x, a.y, 60);
        g.fx.push({ type: 'thrust', x: a.x, y: a.y, angle: a.facing, t: 0, life: 0.15 });
      }
      if (a.life <= 0) {
        a.dead = true;
        g.fx.push({ type: 'puff', x: a.x, y: a.y, t: 0, life: 0.5, size: 16, tone: 'light' });
      }
    } else if (a.kind === 'retinue') {
      updateRetinue(g, a, dt);
    } else if (a.kind === 'maguni') {
      updateMaguni(g, a, maguniIndex++, maguniCount, dt);
    } else if (a.kind === 'decoy') {
      // 신숭겸 in the king's armour: runs off with the royal flag, drawing enemies away.
      a.life -= dt;
      a.x += Math.cos(a.facing) * 120 * dt;
      a.y += Math.sin(a.facing) * 120 * dt;
      if (a.life <= 0) {
        a.dead = true;
        g.fx.push({ type: 'ink', x: a.x, y: a.y, t: 0, life: 1, size: 22, seed: 0.7 });
      }
    } else if (a.kind === 'shin') {
      // 신숭겸 in the king's armour charges the nearest foes, crying that he is the king.
      a.life -= dt;
      a.cd -= dt;
      a.hurtFlash = (a.hurtFlash ?? 0) - dt;
      a.shout = (a.shout ?? 0) - dt;
      a.nextShout = (a.nextShout ?? 0) - dt;
      if (a.nextShout <= 0) {
        a.shout = SHIN_AI.shoutFor;
        a.nextShout = SHIN_AI.shoutEvery;
      }
      // He never falls back to the king: he goes from one foe to the next.
      const target = g.nearestEnemy(a.x, a.y, SHIN_AI.seek);
      if (target) {
        a.facing = Math.atan2(target.y - a.y, target.x - a.x);
        const d = Math.hypot(target.x - a.x, target.y - a.y);
        const reach = a.r + target.r + 22;
        if (d > reach) {
          const step = Math.min(d - reach, SHIN_AI.speed * dt);
          a.x += Math.cos(a.facing) * step;
          a.y += Math.sin(a.facing) * step;
        }
      }
      if (target && Math.hypot(target.x - a.x, target.y - a.y) < a.r + target.r + 30) {
        if (a.cd <= 0) {
          a.cd = 0.8 * p.stats.haste;
          g.damageEnemy(target, a.damage * p.stats.might, a.x, a.y, 70);
          g.fx.push({ type: 'slash', x: a.x, y: a.y, angle: a.facing, range: 44, arc: 120, t: 0, life: 0.18 });
        }
      }
      if (a.hp <= 0 || a.life <= 0) fallShin(g, a);
    } else if (a.kind === 'archer') {
      // Temporary archers (stage events) leave when their time is up.
      if (a.maxLife) {
        a.life -= dt;
        if (a.life <= 0) {
          a.dead = true;
          g.fx.push({ type: 'puff', x: a.x, y: a.y, t: 0, life: 0.5, size: 16, tone: 'light' });
          continue;
        }
      }
      // Archers keep a fixed spot behind the hero (no circling), spread side by side.
      const side = (archerIndex - (archerCount - 1) / 2) * 26;
      archerIndex++;
      const f = p.facing;
      const tx = p.x - Math.cos(f) * 46 - Math.sin(f) * side;
      const ty = p.y - Math.sin(f) * 46 + Math.cos(f) * side;
      a.cd -= dt;
      const target = g.nearestEnemy(a.x, a.y, 380);
      archerStep(g, a, tx, ty, !!target, dt);
      if (target) a.facing = Math.atan2(target.y - a.y, target.x - a.x);
      if (target && a.cd <= 0) {
        // 왕건's own 궁수대 loose three times as often as the archers that join for a stage event.
        a.cd = (a.maxLife ? 1.4 : 1.4 / 3) * p.stats.haste;
        const s = 440;
        g.projectiles.push({
          team: 'player', kind: 'arrow', x: a.x, y: a.y,
          vx: Math.cos(a.facing) * s, vy: Math.sin(a.facing) * s,
          r: 5, damage: 10 * p.stats.might * (1 + (p.meta.allyMul ?? 0)), knockback: 25, life: 1, pierce: 1, hit: new Set(), angle: a.facing,
        });
      }
    }
  }
  g.allies = g.allies.filter((a) => !a.dead);
}

// ------------------------------------------------------------------ 군세

/**
 * 군령: each kind of standing troop has its own cycle and its own move.
 * 창병 돌격 (charge ahead) · 궁병 일제사격 (rapid volley) · 친위대 호위진 (ward ring).
 */
export const ORDERS = {
  spear: { every: 6, name: '창병 돌격', sfx: 'horn' },
  archer: { every: 4.5, name: '일제사격', sfx: 'volley' },
  guard: { every: 8, name: '호위진', sfx: 'gong' },
};
const RET = {
  spear: { damage: 12, cooldown: 0.6, reach: 170, charge: { speed: 540, distance: 250, damage: 26, knockback: 220 } },
  archer: { damage: 6, cooldown: 0.15, range: 360, volley: { arrows: 6, gap: 0.07, damage: 9 } },
  guard: { damage: 8, cooldown: 0.9, radius: 52, ward: { radius: 120, damage: 18, knockback: 280, time: 2 } },
};
const allyMul = (p) => p.stats.might * (1 + (p.meta.allyMul ?? 0));

/** Order cycle length for one kind (보물 친위대의 방패 shortens every cycle). */
export function orderEvery(g, role) {
  const p = g.player;
  return ORDERS[role].every * Math.max(0.4, 1 - (p.meta.orderHaste ?? 0) - 0.1 * (p.upgrades.orderDrill ?? 0));
}

function updateOrders(g, dt) {
  if (!g.orders) return;
  const p = g.player;
  for (const [role, o] of Object.entries(g.orders)) {
    o.t -= dt;
    if (o.t > 0) continue;
    o.t = orderEvery(g, role);
    const troops = g.allies.filter((a) => a.kind === 'retinue' && a.role === role);
    for (const a of troops) fireOrder(g, a);
    if (role === 'guard') {
      // 호위진: one ring around the king, however many guards there are.
      const W = RET.guard.ward;
      hitArc(g, p.x, p.y, 0, W.radius, 360, W.damage * allyMul(p), W.knockback, 'royal');
      p.wardUntil = g.time + W.time + (p.meta.wardDur ?? 0);
      g.shake(4);
    }
    g.texts.push({ x: p.x, y: p.y - 46, v: `⚔️ 군령 — ${ORDERS[role].name}`, t: 0, life: 1.1, order: true });
    g.sfx(ORDERS[role].sfx);
  }
}

function fireOrder(g, a) {
  const p = g.player;
  if (a.role === 'spear') {
    const t = g.nearestEnemy(p.x, p.y, 420);
    const dir = t ? Math.atan2(t.y - a.y, t.x - a.x) : p.facing;
    a.charge = { dir, left: RET.spear.charge.distance, hit: new Set() };
    a.facing = dir;
  } else if (a.role === 'archer') {
    a.volley = RET.archer.volley.arrows + (p.meta.volleyBonus ?? 0);
    a.volleyCd = 0;
  }
}

/** How far an archer may fall behind before it reappears beside the king. */
const ARCHER_LEASH = 420;

/**
 * Archers stand their ground while they have something to shoot and only
 * walk back to their spot when idle. Left too far behind, they rejoin at
 * the king's side in a puff of dust.
 */
function archerStep(g, a, tx, ty, shooting, dt) {
  const p = g.player;
  if ((a.x - p.x) ** 2 + (a.y - p.y) ** 2 > ARCHER_LEASH ** 2) {
    g.fx.push({ type: 'puff', x: a.x, y: a.y, t: 0, life: 0.4, size: 14, tone: 'light' });
    a.x = tx;
    a.y = ty;
    g.fx.push({ type: 'puff', x: a.x, y: a.y, t: 0, life: 0.5, size: 16, tone: 'light' });
    return;
  }
  if (shooting) return;
  const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
  if (d < 2) return;
  const step = Math.min(d, 260 * dt);
  a.x += (dx / d) * step;
  a.y += (dy / d) * step;
}

/** Where each standing troop keeps station, relative to the king's facing. */
function stationOf(p, a) {
  const f = p.facing;
  const [fwd, side] = a.role === 'spear' ? [34, a.idx % 2 ? 24 : -24]
    : a.role === 'archer' ? [-38, (a.idx - 0.5) * 22]
    : [6, a.idx % 2 ? -30 : 30];
  return { x: p.x + Math.cos(f) * fwd - Math.sin(f) * side, y: p.y + Math.sin(f) * fwd + Math.cos(f) * side };
}

function updateRetinue(g, a, dt) {
  const p = g.player;
  const R = RET[a.role];
  a.cd -= dt;
  const home = stationOf(p, a);
  const moveTo = (x, y, speed) => {
    const dx = x - a.x, dy = y - a.y, d = Math.hypot(dx, dy);
    if (d < 2) return d;
    const step = Math.min(d, speed * dt);
    a.x += (dx / d) * step;
    a.y += (dy / d) * step;
    return d;
  };

  if (a.role === 'spear') {
    if (a.charge) {
      // 전방 돌격: run straight through, striking each enemy once.
      const C = R.charge;
      const step = C.speed * dt;
      a.x += Math.cos(a.charge.dir) * step;
      a.y += Math.sin(a.charge.dir) * step;
      a.charge.left -= step;
      if (Math.random() < 0.5) g.fx.push({ type: 'puff', x: a.x, y: a.y, t: 0, life: 0.4, size: 12, tone: 'mud' });
      g.grid.query(a.x, a.y, a.r + 30, (e) => {
        if (e.dead || a.charge.hit.has(e) || g.isCharmed(e) || e.def.behavior === 'static') return;
        if ((e.x - a.x) ** 2 + (e.y - a.y) ** 2 > (a.r + e.r + 6) ** 2) return;
        a.charge.hit.add(e);
        g.damageEnemy(e, C.damage * allyMul(p), a.x, a.y, C.knockback);
      });
      if (a.charge.left <= 0) a.charge = null;
      return;
    }
    const t = g.nearestEnemy(a.x, a.y, 140);
    if (t && (t.x - p.x) ** 2 + (t.y - p.y) ** 2 < R.reach * R.reach) {
      a.facing = Math.atan2(t.y - a.y, t.x - a.x);
      const d = moveTo(t.x, t.y, 210);
      if (d < t.r + a.r + 16 && a.cd <= 0) {
        a.cd = R.cooldown * p.stats.haste;
        g.damageEnemy(t, R.damage * allyMul(p), a.x, a.y, 60);
        g.fx.push({ type: 'thrust', x: a.x, y: a.y, angle: a.facing, t: 0, life: 0.15 });
      }
    } else {
      moveTo(home.x, home.y, 240);
      a.facing = p.facing;
    }
  } else if (a.role === 'archer') {
    const t = g.nearestEnemy(a.x, a.y, R.range);
    archerStep(g, a, home.x, home.y, !!t || a.volley > 0, dt);
    if (t) a.facing = Math.atan2(t.y - a.y, t.x - a.x);
    const shoot = (damage, spread) => {
      const ang = a.facing + (Math.random() - 0.5) * spread;
      g.projectiles.push({
        team: 'player', kind: 'arrow', x: a.x, y: a.y, vx: Math.cos(ang) * 480, vy: Math.sin(ang) * 480,
        r: 5, damage: damage * allyMul(p), knockback: 20, life: 0.9, pierce: 1, hit: new Set(), angle: ang,
      });
    };
    if (a.volley > 0) {
      // 연속 일제사격: a quick stream of arrows.
      a.volleyCd -= dt;
      if (a.volleyCd <= 0 && t) {
        a.volleyCd = R.volley.gap;
        a.volley--;
        shoot(R.volley.damage, 0.25);
        if (a.volley % 2 === 0) g.sfx('volley');
      }
      if (!t) a.volley = 0;
    } else if (t && a.cd <= 0) {
      a.cd = R.cooldown * p.stats.haste;
      shoot(R.damage, 0.08);
    }
  } else {
    // 친위대: keeps to the king's side and shoves back whoever comes close.
    moveTo(home.x, home.y, 300);
    a.facing = p.facing;
    if (a.cd <= 0) {
      let hit = false;
      g.grid.query(a.x, a.y, R.radius + 20, (e) => {
        if (e.dead || g.isCharmed(e) || e.def.behavior === 'static') return;
        if ((e.x - a.x) ** 2 + (e.y - a.y) ** 2 > (R.radius + e.r) ** 2) return;
        g.damageEnemy(e, R.damage * allyMul(p), p.x, p.y, 160);
        hit = true;
      });
      if (hit) {
        a.cd = R.cooldown * p.stats.haste;
        g.fx.push({ type: 'slash', x: a.x, y: a.y, angle: Math.atan2(a.y - p.y, a.x - p.x), range: R.radius, arc: 140, t: 0, life: 0.18 });
      }
    }
  }
}

/** 신숭겸: how far he looks for a fight, how fast he runs, how often he shouts. */
const SHIN_AI = { seek: 600, speed: 175, shoutEvery: 4.5, shoutFor: 1.8 };

/** 통솔 spearmen. */
const SOLDIER = { damage: 14, cooldown: 0.5, speed: 195 };

/** 마구니: tuning. Blocks recharge so a dense volley can still get through. */
const MAGUNI = { orbit: 64, spin: 2.6, damage: 7, hitEvery: 0.45, rest: 0.5 };

/** One orbiting spirit: catches enemy shots and nips enemies it brushes. */
function updateMaguni(g, a, i, n, dt) {
  const p = g.player;
  const ang = g.time * MAGUNI.spin + (i / n) * TAU;
  const orbit = MAGUNI.orbit + n * 4;
  a.x = p.x + Math.cos(ang) * orbit;
  a.y = p.y + Math.sin(ang) * orbit * 0.8;
  a.facing = ang + Math.PI / 2;
  a.rest -= dt;
  if (a.rest <= 0) {
    for (const pr of g.projectiles) {
      if (pr.team !== 'enemy' || pr.life <= 0) continue;
      const rr = pr.r + a.r + 6;
      if ((pr.x - a.x) ** 2 + (pr.y - a.y) ** 2 < rr * rr) {
        pr.life = 0;
        a.rest = MAGUNI.rest;
        g.fx.push({ type: 'spark', x: pr.x, y: pr.y, t: 0, life: 0.25 });
        break;
      }
    }
  }
  g.grid.query(a.x, a.y, a.r + 30, (e) => {
    if (e.dead || g.isCharmed(e) || e.def.behavior === 'static') return;
    const rr = a.r + e.r;
    if ((e.x - a.x) ** 2 + (e.y - a.y) ** 2 > rr * rr) return;
    if ((a.hitAt.get(e) ?? -1) > g.time) return;
    a.hitAt.set(e, g.time + MAGUNI.hitEvery);
    g.damageEnemy(e, MAGUNI.damage * p.stats.might, a.x, a.y, 20);
  });
}

/** 신숭겸 falls; at the last tier his fall is an explosion. */
function fallShin(g, a) {
  a.dead = true;
  g.fx.push({ type: 'ink', x: a.x, y: a.y, t: 0, life: 1.1, size: 26, seed: 0.4 });
  if (a.explode) {
    const E = a.explode;
    hitArc(g, a.x, a.y, 0, E.radius, 360, E.damage * g.player.stats.might, 260, 'blast', { stun: E.stun });
    g.shake(12);
    g.sfx('blast');
    g.banner('순절 — 신숭겸이 적진과 함께 스러진다', 'small');
  } else {
    g.banner('신숭겸이 대신 쓰러졌다', 'small');
    g.sfx('gong');
  }
}
