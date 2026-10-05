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
      hitArc(g, p.x, p.y, aim, range, lv.arc, lv.damage * s.might, lv.knockback, 'slash');
      if (lv.double) {
        g.later(0.15, () => hitArc(g, p.x, p.y, aim + Math.PI, range, lv.arc, lv.damage * s.might, lv.knockback, 'slash'));
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

  // 견훤 진화: 횡베기 → 횡베기 → 대지 가르기 (관통 충격파 + 기절)
  comboChop: {
    fire(g, p, lv, s) {
      const w = p.weapon;
      const range = lv.range * s.area;
      const aim = aimAngle(g, p, range);
      w.combo = w.combo ?? 0;
      if (w.combo < 2) {
        const side = w.combo === 0 ? -0.35 : 0.35;
        hitArc(g, p.x, p.y, aim + side, range, lv.arc, lv.damage * s.might, lv.knockback, 'chop');
        w.combo++;
        w.timer = lv.comboGap * s.haste;
        g.sfx('chop');
        return;
      }
      w.combo = 0;
      hitArc(g, p.x, p.y, aim, range * 0.8, 70, lv.damage * 1.2 * s.might, lv.knockback * 1.5, 'chop', { stun: lv.wave.stun });
      const W = lv.wave;
      g.projectiles.push({
        team: 'player', kind: 'quake', x: p.x, y: p.y,
        vx: Math.cos(aim) * W.speed, vy: Math.sin(aim) * W.speed,
        r: W.radius * s.area, damage: lv.damage * W.damage * s.might, knockback: 160,
        life: W.life, pierce: Infinity, hit: new Set(), angle: aim, stun: W.stun,
      });
      g.shake(6);
      g.sfx('quake');
    },
  },

  // 궁예 1~3단계: 주위 한 바퀴 휘두르기 (+ 바닥 내려치기)
  maceSwing: {
    fire(g, p, lv, s) {
      const range = lv.range * s.area;
      hitArc(g, p.x, p.y, p.facing, range, 360, lv.damage * s.might, lv.knockback, 'swing');
      if (lv.slam) {
        g.later(lv.slam.delay, () => {
          hitArc(g, p.x, p.y, 0, range * lv.slam.radius, 360, lv.damage * lv.slam.damage * s.might, lv.knockback, 'ring');
          g.sfx('slam');
        });
      }
      g.sfx('swing');
    },
  },

  // 궁예 진화: 철퇴 두 개가 상시 공전, 6초마다 광배 폭발
  mireukMace: {
    update(g, p, lv, s, dt) {
      const O = lv.orbit;
      p.orbitAngle = (p.orbitAngle ?? 0) + O.speed * dt;
      const radius = lv.range * s.area * (1 + O.pulse * Math.sin(g.time * 2.2));
      const size = O.size * s.area;
      p.orbit = [];
      for (let i = 0; i < O.count; i++) {
        const a = p.orbitAngle + (i * TAU) / O.count;
        const mx = p.x + Math.cos(a) * radius, my = p.y + Math.sin(a) * radius;
        p.orbit.push({ x: mx, y: my, a, size });
        g.grid.query(mx, my, size + 30, (e) => {
          if (e.dead) return;
          const rr = size + e.r;
          if ((e.x - mx) ** 2 + (e.y - my) ** 2 > rr * rr) return;
          if (g.time - (e.orbitHitAt ?? -9) < O.rehit) return;
          e.orbitHitAt = g.time;
          g.damageEnemy(e, lv.damage * s.might, mx, my, lv.knockback);
        });
      }
    },
    fire(g, p, lv, s) {
      // The first tick only arms the timer so the halo does not fire at once.
      if (!p.haloArmed) {
        p.haloArmed = true;
        return;
      }
      hitArc(g, p.x, p.y, 0, lv.halo.radius * s.area, 360, lv.damage * lv.halo.damage * s.might, 120, 'halo');
      g.sfx('halo');
    },
  },
};

/** Ticks the player's weapon and fires when ready. */
export function updateWeapon(g, dt) {
  const p = g.player;
  const w = p.weapon;
  const lv = WEAPONS[w.id].levels[w.level];
  const pat = PATTERNS[lv.pattern];
  if (pat.update) pat.update(g, p, lv, p.stats, dt);
  else p.orbit = null;
  w.timer -= dt;
  if (w.timer > 0) return;
  w.timer = lv.cooldown * p.stats.haste;
  pat.fire(g, p, lv, p.stats);
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
export function hitArc(g, x, y, angle, range, arcDeg, damage, knockback, style, opts) {
  const half = (arcDeg * Math.PI) / 360;
  g.grid.query(x, y, range + 40, (e) => {
    if (e.dead) return;
    const dx = e.x - x, dy = e.y - y;
    const d = Math.hypot(dx, dy);
    if (d > range + e.r) return;
    if (arcDeg < 360 && d > e.r + 8 && Math.abs(angleDiff(Math.atan2(dy, dx), angle)) > half + e.r / Math.max(d, 1)) return;
    g.damageEnemy(e, damage, x, y, knockback, opts);
  });
  const life = { royal: 0.28, halo: 0.45, ring: 0.3, chop: 0.22 }[style] ?? 0.2;
  g.fx.push({ type: style, x, y, angle, range, arc: arcDeg, t: 0, life });
}
