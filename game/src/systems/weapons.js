import { WEAPONS } from '../data/weapons.js';
import { TAU, angleDiff } from '../core/math.js';

/**
 * Attack patterns, keyed by the `pattern` field of a weapon level.
 * fire(game, player, levelDef, stats) performs one attack when the cooldown
 * is up; the optional update(...) runs every frame (for persistent weapons).
 */
export const PATTERNS = {
  // 왕건 1~3단계
  arcSlash: {
    fire(g, p, lv, s) {
      const range = lv.range * s.area;
      const aim = aimAngle(g, p, range);
      hitArc(g, p.x, p.y, aim, range, lv.arc, lv.damage * s.might, lv.knockback, 'kingSlash');
      if (lv.double) {
        g.later(0.15, () => hitArc(g, p.x, p.y, aim + Math.PI, range, lv.arc, lv.damage * s.might, lv.knockback, 'kingSlash'));
      }
      g.sfx('slash');
    },
  },

  // 왕건 진화: 회전베기 + 관통 검기
  royalSword: {
    fire(g, p, lv, s) {
      const range = lv.range * s.area;
      hitArc(g, p.x, p.y, p.facing, range, 360, lv.damage * s.might, lv.knockback, 'royal');
      const dirs = [];
      for (const e of g.nearestEnemies(p.x, p.y, 520, lv.waves)) dirs.push(Math.atan2(e.y - p.y, e.x - p.x));
      for (let i = dirs.length; i < lv.waves; i++) dirs.push(p.facing + (i * TAU) / lv.waves);
      for (const a of dirs) {
        g.projectiles.push({
          team: 'player', kind: 'wave', x: p.x, y: p.y,
          vx: Math.cos(a) * lv.waveSpeed, vy: Math.sin(a) * lv.waveSpeed,
          r: 18 * s.area, damage: lv.damage * lv.waveDamage * s.might, knockback: 40,
          life: lv.waveLife, pierce: Infinity, hit: new Set(), angle: a,
        });
      }
      g.sfx('royal');
    },
  },

  // 견훤 1~3단계: 좁고 무거운 내려찍기 (+ 갈라진 땅)
  heavyChop: {
    fire(g, p, lv, s) {
      const range = lv.range * s.area;
      const aim = aimAngle(g, p, range);
      hitArc(g, p.x, p.y, aim, range, lv.arc, lv.damage * s.might, lv.knockback, 'chop');
      if (lv.crack) {
        const d = range * 0.7;
        g.zones.push({
          team: 'player', kind: 'crack', x: p.x + Math.cos(aim) * d, y: p.y + Math.sin(aim) * d,
          r: lv.crack.radius * s.area, dps: lv.crack.dps * s.might, life: lv.crack.life, t: 0, angle: aim,
        });
      }
      g.sfx('chop');
    },
  },

  // 견훤 진화: 횡베기 → 횡베기 → 내려베기, 벨 때마다 붉은 검기 (좁고 길게, 관통)
  comboChop: {
    fire(g, p, lv, s) {
      const w = p.weapon;
      const range = lv.range * s.area;
      const aim = aimAngle(g, p, range);
      const W = lv.wave;
      const qi = (big) => g.projectiles.push({
        team: 'player', kind: 'redSlash', x: p.x + Math.cos(aim) * 20, y: p.y + Math.sin(aim) * 20,
        vx: Math.cos(aim) * W.speed, vy: Math.sin(aim) * W.speed,
        r: W.thick, span: (big ? W.bigSpan : W.span) * s.area, big,
        damage: lv.damage * (big ? W.damage : W.small) * s.might, knockback: big ? 160 : 60,
        life: W.life, pierce: Infinity, hit: new Set(), angle: aim, stun: big ? W.stun : 0,
      });
      w.combo = w.combo ?? 0;
      if (w.combo < 2) {
        const side = w.combo === 0 ? -0.35 : 0.35;
        hitArc(g, p.x, p.y, aim + side, range, lv.arc, lv.damage * s.might, lv.knockback, 'chop');
        qi(false);
        w.combo++;
        w.timer = lv.comboGap * s.haste;
        g.sfx('slash');
        return;
      }
      w.combo = 0;
      hitArc(g, p.x, p.y, aim, range * 0.8, 70, lv.damage * 1.2 * s.might, lv.knockback * 1.5, 'chop', { stun: W.stun });
      qi(true);
      g.shake(5);
      g.sfx('royal');
    },
  },

  // 궁예 주무기 1~3단계: 가까운 적에게 법력구 (부채꼴 다발)
  orbShot: {
    fire(g, p, lv, s) {
      const range = lv.range * Math.sqrt(s.area);
      const target = g.nearestEnemy(p.x, p.y, range);
      if (!target) return retry();
      const aim = Math.atan2(target.y - p.y, target.x - p.x);
      p.facing = aim;
      const spread = (lv.spread * Math.PI) / 180;
      for (let i = 0; i < lv.count; i++) {
        const a = aim + (lv.count > 1 ? -spread / 2 + (spread * i) / (lv.count - 1) : 0);
        g.projectiles.push({
          team: 'player', kind: 'orb', x: p.x, y: p.y,
          vx: Math.cos(a) * lv.speed, vy: Math.sin(a) * lv.speed,
          r: lv.size * s.area, damage: lv.damage * s.might, knockback: lv.knockback,
          life: (range * 1.15) / lv.speed, pierce: lv.pierce, hit: new Set(), angle: a,
        });
      }
      g.sfx('orb');
    },
  },

  // 궁예 주무기 진화: 꿰뚫는 빛줄기 세 갈래 + 맞은 자리 연꽃 폭발
  lightBeam: {
    fire(g, p, lv, s) {
      const range = lv.range * Math.sqrt(s.area);
      const targets = g.nearestEnemies(p.x, p.y, range, lv.beams);
      if (!targets.length) return retry();
      p.facing = Math.atan2(targets[0].y - p.y, targets[0].x - p.x);
      for (let i = 0; i < lv.beams; i++) {
        const t = targets[i % targets.length];
        const a = Math.atan2(t.y - p.y, t.x - p.x) + (i >= targets.length ? (i - 1) * 0.3 : 0);
        g.projectiles.push({
          team: 'player', kind: 'beam', x: p.x, y: p.y,
          vx: Math.cos(a) * lv.speed, vy: Math.sin(a) * lv.speed,
          r: lv.size * s.area, damage: lv.damage * s.might, knockback: lv.knockback,
          life: (range * 1.1) / lv.speed, pierce: Infinity, hit: new Set(), angle: a,
          burst: { radius: lv.burst.radius * s.area, damage: lv.damage * lv.burst.damage * s.might },
        });
      }
      g.sfx('beam');
    },
  },

  // 금강저 1~3단계: 던진 금강저에서 벼락이 적을 타고 번진다
  chainBolt: {
    fire(g, p, lv, s) {
      const starts = g.nearestEnemies(p.x, p.y, lv.range * Math.sqrt(s.area), lv.bolts);
      if (!starts.length) return retry();
      for (const t of starts) chain(g, { x: p.x, y: p.y }, t, chainJumps(p, lv), lv.chainRange * s.area, lv.damage * s.might);
      g.sfx('thunder');
    },
  },

  // 금강저 진화: 하늘에서 벼락 여러 줄기, 각각 번진다
  thunderStorm: {
    fire(g, p, lv, s) {
      const pool = g.nearestEnemies(p.x, p.y, lv.range * Math.sqrt(s.area), 40);
      if (!pool.length) return retry();
      for (let i = 0; i < lv.strikes && pool.length; i++) {
        const t = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        chain(g, { x: t.x + 10, y: t.y - 220 }, t, chainJumps(p, lv), lv.chainRange * s.area, lv.damage * s.might);
      }
      g.shake(4);
      g.sfx('thunder');
    },
  },
};

/** 장병술 widens lightning: one extra jump for every two levels. */
function chainJumps(p, lv) {
  return lv.chains + Math.floor((p.upgrades.area ?? 0) / 2);
}

/** No target in reach: check again soon instead of waiting a full cooldown. */
function retry() {
  return 0.15;
}

/** Lightning from `from` into `first`, then jumping to nearby enemies. */
function chain(g, from, first, jumps, jumpRange, damage) {
  const hit = new Set();
  const points = [from];
  let cur = first;
  let dmg = damage;
  for (let k = 0; k <= jumps && cur; k++) {
    hit.add(cur);
    points.push({ x: cur.x, y: cur.y });
    g.damageEnemy(cur, dmg, cur.x, cur.y, 0);
    dmg *= 0.85;
    let best = null, bd = jumpRange * jumpRange;
    g.grid.query(cur.x, cur.y, jumpRange, (e) => {
      if (e.dead || hit.has(e) || g.isCharmed(e) || e.def.behavior === 'static') return;
      const d = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2;
      if (d < bd) {
        bd = d;
        best = e;
      }
    });
    cur = best;
  }
  g.fx.push({ type: 'bolt', points, t: 0, life: 0.28, seed: Math.random() });
}

/** Ticks every weapon the player holds and fires those that are ready. */
export function updateWeapon(g, dt) {
  const p = g.player;
  const m = p.meta;
  for (const w of p.weapons()) {
    const lv = WEAPONS[w.id].levels[w.level];
    const pat = PATTERNS[lv.pattern];
    const main = w === p.weapon;
    const s = p.stats;
    pat.update?.(g, p, lv, s, dt);
    w.timer -= dt;
    if (w.timer > 0) continue;
    w.timer = lv.cooldown * p.stats.haste * (1 - (m[`${w.id}Cd`] ?? 0));
    // A pattern may return a shorter wait (e.g. nothing was in reach).
    const wait = pat.fire(g, p, lv, s);
    if (typeof wait === 'number') w.timer = wait;
    else if (main) {
      g.afterSwing();
      // The hero's arm swings with the blow (drawn in render/sprites.js drawUnit).
      const style = lv.pattern === 'royalSword' ? 'spin' : { sword: 'slash', greatsword: 'chop', staff: 'cast' }[p.hero.look.weapon] ?? 'slash';
      p.swing = { at: g.time, dur: style === 'chop' ? 0.42 : style === 'spin' ? 0.32 : 0.24, style, dir: -(p.swing?.dir ?? -1) };
    }
  }
}

export function currentWeaponLevel(p) {
  return WEAPONS[p.weapon.id].levels[p.weapon.level];
}

/** Face the nearest enemy in reach; otherwise keep the movement direction. */
function aimAngle(g, p, range) {
  const e = g.nearestEnemy(p.x, p.y, range * 1.8);
  if (e) p.facing = Math.atan2(e.y - p.y, e.x - p.x);
  return p.facing;
}

/** Damages every enemy inside a circular sector and leaves an effect. */
/** Strikes every foe in an arc; returns how many were hit. */
export function hitArc(g, x, y, angle, range, arcDeg, damage, knockback, style, opts) {
  const half = (arcDeg * Math.PI) / 360;
  let hits = 0;
  g.grid.query(x, y, range + 40, (e) => {
    if (e.dead) return;
    const dx = e.x - x, dy = e.y - y;
    const d = Math.hypot(dx, dy);
    if (d > range + e.r) return;
    if (arcDeg < 360 && d > e.r + 8 && Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > half + e.r / Math.max(d, 1)) return;
    if (!g.isCharmed(e)) hits++;
    g.damageEnemy(e, damage, x, y, knockback, opts);
  });
  const life = { royal: 0.3, kingSlash: 0.24, burst: 0.4, chop: 0.34, blast: 0.6 }[style] ?? 0.2;
  g.fx.push({ type: style, x, y, angle, range, arc: arcDeg, t: 0, life });
  return hits;
}
