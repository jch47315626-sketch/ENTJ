import { TAU } from '../core/math.js';
import { hitArc } from './weapons.js';
import { MAGUNI_LV } from '../data/skills.js';

/** Updates summoned soldiers and following archers. */
export function updateAllies(g, dt) {
  const p = g.player;
  updateOrders(g, dt);
  updateMaguniSkill(g, dt);
  let archerIndex = 0;
  const archerCount = g.allies.filter((a) => a.kind === 'archer').length;
  let maguniIndex = 0;
  const maguniCount = g.allies.filter((a) => a.kind === 'maguni' && !a.dead).length;

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
    } else if (a.kind === 'maguniBomb') {
      updateMaguniBomb(g, a, dt);
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
      // Short bows: they pick targets and their arrows fly about half as far as before.
      const target = g.nearestEnemy(a.x, a.y, 190);
      archerStep(g, a, tx, ty, !!target, dt);
      if (target) a.facing = Math.atan2(target.y - a.y, target.x - a.x);
      if (target && a.cd <= 0) {
        // 왕건's own 궁수대 loose three times as often as the archers that join for a stage event.
        a.cd = (a.maxLife ? 1.4 : 1.4 / 3) * p.stats.haste;
        const s = 440;
        g.projectiles.push({
          team: 'player', kind: 'arrow', x: a.x, y: a.y,
          vx: Math.cos(a.facing) * s, vy: Math.sin(a.facing) * s,
          r: 5, damage: 17 * p.stats.might * (1 + (p.meta.allyMul ?? 0)), knockback: 25, life: 0.5, pierce: 1, hit: new Set(), angle: a.facing,
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
  archer: { damage: 10, cooldown: 0.15, range: 180, volley: { arrows: 6, gap: 0.07, damage: 15 } },
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
        r: 5, damage: damage * allyMul(p), knockback: 20, life: 0.45, pierce: 1, hit: new Set(), angle: ang,
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
const SOLDIER = { damage: 11, cooldown: 0.5, speed: 195 };

/** 마구니: how they circle, and how the 폭탄 flies. */
const MAGUNI = { orbit: 64, spin: 3.4, wardSpin: 4.8, guard: 26, bombSpeed: 460, bombLife: 1.6, seek: 650 };

/** One circling spirit. Under 마구니 결계 it also nudges and hurts foes it brushes. */
function updateMaguni(g, a, i, n, dt) {
  const p = g.player;
  const W = MAGUNI_LV[(p.upgrades.maguni ?? 1) - 1]?.ward;
  const ang = g.time * (W ? MAGUNI.wardSpin : MAGUNI.spin) + (i / n) * TAU;
  const orbit = MAGUNI.orbit + n * 4;
  a.x = p.x + Math.cos(ang) * orbit;
  a.y = p.y + Math.sin(ang) * orbit * 0.8;
  a.facing = ang + Math.PI / 2;
  a.rest = 0;
  if (!W) return;
  g.grid.query(a.x, a.y, a.r + 30, (e) => {
    if (e.dead || g.isCharmed(e) || e.def.behavior === 'static') return;
    const rr = a.r + e.r;
    if ((e.x - a.x) ** 2 + (e.y - a.y) ** 2 > rr * rr) return;
    if ((a.hitAt.get(e) ?? -1) > g.time) return;
    a.hitAt.set(e, g.time + W.hitEvery);
    g.damageEnemy(e, W.damage * p.stats.might, p.x, p.y, W.push);
  });
}

/** A 마구니 폭탄 on its way into the enemy; bursts on arrival. */
function updateMaguniBomb(g, a, dt) {
  a.life -= dt;
  const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy) || 1;
  const step = MAGUNI.bombSpeed * dt;
  a.facing = Math.atan2(dy, dx);
  if (d > step && a.life > 0) {
    a.x += (dx / d) * step;
    a.y += (dy / d) * step;
    return;
  }
  a.dead = true;
  const p = g.player;
  hitArc(g, a.x, a.y, 0, a.radius * p.stats.area, 360, a.damage * p.stats.might, 160, 'blast', { stun: 0.5 });
  g.fx.push({ type: 'ink', x: a.x, y: a.y, t: 0, life: 0.9, size: 30, seed: 0.6 });
  g.shake(6);
  g.sfx('blast');
}

/** Where a 폭탄 does the most: the foe with the most company nearby. */
function bombTarget(g) {
  const p = g.player;
  const near = g.nearestEnemies(p.x, p.y, MAGUNI.seek, 40).filter((e) => !g.isCharmed(e) && e.def.behavior !== 'static');
  let best = null, most = -1;
  for (const e of near) {
    let n = 0;
    for (const o of near) if ((o.x - e.x) ** 2 + (o.y - e.y) ** 2 < 120 * 120) n++;
    if (n > most) {
      most = n;
      best = e;
    }
  }
  return best;
}

/**
 * 마구니 (궁예): one appears every few seconds up to the cap; each catches one
 * shot just before it lands and vanishes. With the cap full, the next one
 * becomes a 폭탄. Under 마구니 결계 all four stay for good.
 */
export function updateMaguniSkill(g, dt) {
  const p = g.player;
  const lv = p.upgrades.maguni ?? 0;
  if (!lv) return;
  const L = MAGUNI_LV[Math.min(lv, MAGUNI_LV.length) - 1];
  const spawn = () => {
    g.allies.push({ kind: 'maguni', x: p.x, y: p.y, r: 10, facing: 0, rest: 0, hitAt: new WeakMap(), born: g.time });
    g.fx.push({ type: 'puff', x: p.x, y: p.y, t: 0, life: 0.45, size: 16, tone: 'light' });
  };
  let list = g.allies.filter((a) => a.kind === 'maguni' && !a.dead);
  if (L.ward) while (list.length < L.max) {
    spawn();
    list = g.allies.filter((a) => a.kind === 'maguni' && !a.dead);
  }
  // Catch a shot just before it reaches 궁예 (결계 softens shots instead).
  if (!L.ward && list.length) {
    for (const pr of g.projectiles) {
      if (pr.team !== 'enemy' || pr.life <= 0) continue;
      const rr = p.r + pr.r + MAGUNI.guard;
      if ((pr.x - p.x) ** 2 + (pr.y - p.y) ** 2 > rr * rr) continue;
      pr.life = 0;
      let m = list[0];
      for (const x of list) if ((x.x - pr.x) ** 2 + (x.y - pr.y) ** 2 < (m.x - pr.x) ** 2 + (m.y - pr.y) ** 2) m = x;
      m.dead = true;
      list = list.filter((x) => x !== m);
      g.fx.push({ type: 'spark', x: pr.x, y: pr.y, t: 0, life: 0.3 });
      g.fx.push({ type: 'puff', x: m.x, y: m.y, t: 0, life: 0.4, size: 14, tone: 'light' });
      if (!list.length) break;
    }
  }
  g.maguniTimer = (g.maguniTimer ?? L.every) - dt;
  if (g.maguniTimer > 0) return;
  g.maguniTimer = L.every;
  if (list.length < L.max) return spawn();
  // All out and nothing to block: one becomes a 폭탄 and dives into the enemy.
  const t = bombTarget(g);
  if (!t) {
    g.maguniTimer = 1;
    return;
  }
  let from = p;
  if (!L.ward) {
    from = list.reduce((a, b) => (a.born <= b.born ? a : b));
    from.dead = true;
  }
  g.allies.push({ kind: 'maguniBomb', x: from.x, y: from.y, r: 15, tx: t.x, ty: t.y, life: MAGUNI.bombLife,
    damage: L.bomb.damage, radius: L.bomb.radius, facing: 0, rest: 0 });
  g.texts.push({ x: from.x, y: from.y - 22, v: '👹 마구니 폭탄!', t: 0, life: 0.8, order: true });
  g.sfx('throw');
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
